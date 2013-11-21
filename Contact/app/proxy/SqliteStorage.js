/**
 * @author Simon Shepherd
 *
 * Based on proxy written by Thomas Alexander and released with his permission
 *
 * This sqlite proxy concentrates on mimicing behavior of localstorage while
 * finishing operations only when the sql transactions return and grouping
 * queries into transactions wherever possible
 */
Ext.define('Contact.proxy.SqliteStorage', {
    extend: 'Ext.data.proxy.Client',
    alias: 'proxy.sqlitestorage',

    config: {
      reader: null,
      writer: null,
      totalRecords: 0,
      sorters: null,
      filters: null,
      grouper: null,
      joinFilters: null,
      sqlCount: null,
      sqlOldCount: ''
    },
    
    constructor: function(config) {
	    this.callParent([config]);
      
      this.setReader(this.reader);
	    var me = this;
	    me.createTable();
    },

    /* INTERFACE FUNCTIONS */
    
    //inherit docs
    create: function(operation, callback, scope) {

      //console.log('create');
      
      var me = this;
      var records = operation.getRecords(),
      length = records.length, i,
      queries = [];
      
      onSuccess = function() {
        operation.setCompleted();
        operation.setSuccessful();
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      },
      onError = function(tx, err) {
        operation.setCompleted();
        operation.setException(err ? err : '');
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      };
	    
      operation.setStarted();
      
      // add empty table? (look at full rewrite)
      if(Ext.isDefined(operation.config.fullRewrite) && operation.config.fullRewrite) {
        queries.push(function(tx) {
          tx.executeSql('DELETE FROM ' + me.config.dbConfig.tablename, []);
        });
      }
      
      // add in each insert
      for (i = 0; i < length; i++) {
        queries.push(this.getInsertRecordFunc(records[i], me.config.dbConfig.tablename));
      }
      
      // do transaction
      me.transactionDB(me.getDb(), queries, onSuccess, onError);
      
    },
    
    //inherit docs
    update: function(operation, callback, scope) {

      //console.log('update');
    
      var me = this;
      var records = operation.getRecords(),
      length = records.length, i,
      queries = [];
      
      onSuccess = function() {
        operation.setCompleted();
        operation.setSuccessful();
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      },
      onError = function(tx, err) {
        operation.setCompleted();
        operation.setException(err ? err : '');
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      };
	    
      operation.setStarted();

      // add in each insert
      for (i = 0; i < length; i++) {
        queries.push(this.getUpdateRecordFunc(records[i], me.config.dbConfig.tablename));
      }
      
      // do transaction
      me.transactionDB(me.getDb(), queries, onSuccess, onError);
      
    },
    
    //inherit docs
    destroy: function(operation, callback, scope) {
      var me = this;
      var records = operation.getRecords(),
      length = records.length, i,
      queries = [];
      
      onSuccess = function() {
        operation.setCompleted();
        operation.setSuccessful();
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      },
      onError = function(tx, err) {
        operation.setCompleted();
        operation.setException(err ? err : '');
        if(typeof callback == 'function') {
          callback.call(scope, operation);
        }
      };
	    
      operation.setStarted();
      
      for (i = 0; i < length; i++) {
        queries.push(this.getDeleteRecordFunc(records[i], me.config.dbConfig.tablename));
      }
      
      // do transaction
      me.transactionDB(me.getDb(), queries, onSuccess, onError);
    },
    
    truncate: function(tablename) {
      var me = this;
      var sql = 'DELETE FROM ' + me.config.dbConfig.tablename;  
      me.queryDB(me.getDb(), sql, function(){}, function(){});
      return true;
    },
    
    //inherit docs
    read: function(operation, callback, scope) {

      //console.log('load');
      
      var me = this,
      param_arr = [],
      limit = operation.getLimit(),
      start = operation.getStart(),
      grouper = operation.getGrouper(),
      sorters = operation.getSorters(),
      filters = operation.getFilters() || me.filters || me.getFilters(),
      fieldTypes = {};
      
	    Ext.iterate(operation.getParams(),function(a,i){
	      param_arr.push(i);
	    });

      me.setFilters(filters);

      me.filters = filters;

      if(filters != null) {
        whereClause = me.whereClause(filters);
      }
	
      // generate sql
	    var sql = "SELECT _ROWID_,*\nFROM " + me.config.dbConfig.tablename;
      if(filters != null) sql += whereClause;
      if(sorters != null || grouper != null) sql += me.orderClause(sorters, grouper);
      if(limit != null || start != null) sql += me.limitClause(limit, start);

      //var total = "SELECT COUNT(*) FROM " + me.config.dbConfig.tablename;

      //me.setTotalRecord(100);

      ////console.log(sql);

      var sqlCount = "SELECT COUNT(*) AS total FROM " + me.config.dbConfig.tablename + " as tb1 ";
      if(filters != null) sqlCount += whereClause;

      me.setSqlCount(sqlCount);
      
      var onSuccess, onError;
      
      onSuccess = function(tx, results) {
	      me.applyDataToModel(tx, results, operation, callback, scope);
      };

      onError = function(tx, err) {
        me.throwDbError(tx, err);
      };

      me.queryDB(me.getDb(), operation.config.sql || sql, onSuccess, onError, param_arr);
      
    },
    
    
    
    /* GENERAL DB FUNCTIONS */
    
    getDb : function() {
	    if(Ext.os.is.iOS || Ext.os.is.Android){
        return window.sqlitePlugin.openDatabase("database", "1.0", "touchson", 200000);
      }else{
        return window.openDatabase("database", "1.0", "database", 200000);
      } 
    },
    
    throwDbError: function(tx, err) {
      var me = this;
      //console.log(this.type + "----" + err.message);
    },
    
    createTable : function() {
      var me = this;

      me.getDb().transaction(
        function(tx) {
            var createsql = 'CREATE TABLE IF NOT EXISTS ' +
            me.config.dbConfig.tablename + '('+me.constructFields()+')';
            tx.executeSql(createsql);
        },
        function(tx, err) {
            me.throwDbError(tx, err);
        },
        function(){
        }
      );

    },
    
    getDbFields: function() {
      var me = this,
      m = me.getModel(),
      fields = m.getFields().items,
      retFields = [];
      
      Ext.each(fields, function(f) {
      
        if((f.config.persist || !Ext.isDefined(f.config.persist)) 
         && (f.getName() != m.getIdProperty())) {
          ////console.log(f);

          var name = f.getName(),
          type = f.config.type,
          option = (f.config.fieldOption)  ? f.config.fieldOption : '';
          
          type =
          type.replace(/int/i, 'INTEGER')
              .replace(/float/i, 'NUMERIC')
              .replace(/string/i,'TEXT')
              .replace(/array/i,'TEXT')
              .replace(/object/i,'TEXT')
              .replace(/boolean/i,'NUMERIC')
              .replace(/date/i, 'NUMERIC');
          
          retFields.push({
            name: name,
            type: type,
            option: option,
            field: f
          });
        }
      });
      
      return retFields;
    },
    
    constructFields: function() {
      var me = this,
      fields = me.getDbFields(),
      flatFields = [];
	    
      Ext.each(fields, function(f) {
        flatFields.push(f.name + ' ' + f.type + ' ' + f.option);
        ////console.log(f.name + ' ' + f.type + ' ' + f.option);
	    });
      
      return flatFields.join(',');
    },
    
    getRecordDbObject: function(record) {
      var me = this,
      fields = me.getDbFields(),
      recObj = {};
      
      Ext.each(fields, function(f) {
        if(Ext.isDefined(record.get(f.name))) {
          
          var value = record.get(f.name);
          
          // need to encode?
          if (f.field.getType().type.toUpperCase() == 'AUTO' && f.name != 'id') {
              value = Ext.encode(value);
          }
          
          recObj[f.name] = value;
        }
      });
      
      return recObj;
    },
    
    queryDB: function(dbConn, sql, successcallback, errorcallback, params,
    callback) {
      
      var me = this;
      dbConn.transaction(function(tx) {
        if (typeof callback == 'function') {
          callback.call(scope || me, results, me);
        }

        tx.executeSql(sql, (params ? params : []),
          successcallback, errorcallback);
      });
      
    },
    
    transactionDB: function(dbConn, queries, successcallback, errorcallback,
    callback) {
      
      var me = this;
      dbConn.transaction(function(tx) {
        if (typeof callback == 'function') {
          callback.call(scope || me, results, me);
        }

        Ext.each(queries, function(query) {
          query(tx);
        });
        
      }, errorcallback, successcallback);
      
    },
    
    /* HELPERS FOR READING */
    
    whereClause: function(filters) {
      var me = this,
      firstFilter = true,
      sql = '',
      fieldTypes = {};
      
      Ext.each(me.getDbFields(), function(f) {
        fieldTypes[f.name] = f.type;
      });
      
      Ext.each(filters, function(filter) {
        // need to make sure this property is in the database
        if(!Ext.isDefined(fieldTypes[filter.getProperty()]))
          return;
        
        if(!firstFilter) sql += "\n  AND";
        else sql += "\nWHERE\n     ";
        firstFilter = false;
        
        sql += ' `' + filter.getProperty() + '`';
        
        // now: do we use like or =?
        if(fieldTypes[filter.getProperty()] == 'TEXT' &&
        !filter.getCaseSensitive()) sql += ' LIKE';
        else sql += ' =';
        
        // need to surround with %?
        if(!filter.getExactMatch() &&
        fieldTypes[filter.getProperty()] == 'TEXT') {
          if(!Ext.os.is.Desktop){
            if(filter.getValue() == "false" || filter.getValue() == false){
              sql += " '%0%'";
            }else{
              if(filter.getValue() == "true" || filter.getValue() == true){
                sql += " '%1%'";
              }else{
                sql += " '%" + filter.getValue() + "%'";    
              }
            }
          }else{
            sql += " '%" + filter.getValue() + "%'";
          }
        } else if(fieldTypes[filter.getProperty()] == 'TEXT') {
          if(!Ext.os.is.Desktop){
            if(filter.getValue() == "false" || filter.getValue() == false){
              sql += " '0'";
            }else{
              if(filter.getValue() == "true" || filter.getValue() == true){
                sql += " '1'";
              }else{
                sql += " '" + filter.getValue() + "'";
              }
            }
          }else{
            sql += " '" + filter.getValue() + "'";
          }
        } else if(fieldTypes[filter.getProperty()] == 'boolean') {
          if(filter.getValue()) {
            sql += " 'true'";
          }
          else {
            sql += " 'false'";
          }
        } else {
          sql += " '" + filter.getValue() + "'";
        }
      });
      
      return sql;
    },
    
    orderClause: function(sorters, grouper) {
      var me = this,
      sql = '',
      orders = [],
      fields = {},
      firstOrder = true;
      
      if(grouper != null) orders.push(grouper);
      if(sorters != null) orders.concat(sorters);
      
      Ext.each(me.getDbFields(), function(f) {
        fields[f.name] = true;
      });
      
      Ext.each(orders, function(order) {
        // need to make sure this property is in the database
        if(!Ext.isDefined(fields[filter.getProperty()]))
          return;
        
        // root config not compatible here
        if(order.getRoot() != null)
          return;
        
        // only accept ASC, DESC for direction
        if(order.getDirection() != 'ASC' && order.getDirection() != 'DESC')
          return;
        
        if(!firstOrder) sql += ",\n  ";
        else sql += "\nORDER BY\n  ";
        firstOrder = false;
        
        sql += "`" + order.getProperty() + "` " + order.getDirection();
      });
      
      return sql;
    },
    
    limitClause: function(limit, start) {
      var sql = "\nLIMIT";
      if(start != null) sql += ' ' + start + ',';
      if(limit != null) sql += ' ' + limit;
      return sql;
    },
    
    parseData: function(tx, rs) {
	
      var rows = rs.rows,
      data = [],
      i = 0;
      
      for (; i < rows.length; i++) {
        data.push(rows.item(i));
      }
      return data;
    },

    setTotal: function(storedatas, operation, callback, scope){
      var me = this;
      if(me.getSqlCount() != me.getSqlOldCount()){
        me.getDb().transaction(function(tx) {            
          var onError = function(tx, err) {
            me.throwDbError(tx, err);
          };
          
          var onSuccess = function(tx, results) {
            if (results.rows) {
              for (i = 0; i < results.rows.length; i++) {
                me.config.totalRecords = results.rows.item(i).total;
              }
              me.applyData(storedatas, operation, callback, scope);
            }
          };

          me.setSqlOldCount(me.getSqlCount());
          var totalSql = me.getSqlCount();
          tx.executeSql(totalSql,[], onSuccess, onError);
        });
      }else{
        me.applyData(storedatas, operation, callback, scope);
      }     
    },
    
    applyData: function(data, operation, callback, scope) {
	    var me = this;
	    
      operation.setSuccessful();
      operation.setCompleted();
	    
      operation.setResultSet(Ext.create('Ext.data.ResultSet', {
        records: data,
	      total  : me.config.totalRecords || 0,
        loaded : true
      }));
        
      // finish with callback
	    operation.setRecords(data);
      
      if (typeof callback == "function") {
        callback.call(scope || me, operation);
      }
    },
    
    applyDataToModel: function(tx, results, operation, callback, scope) {
      var me = this,
	    Model = me.getModel(),
	    fields = Model.getFields().items;
      
      var records = me.parseData(tx, results);
      
      var storedatas = [];
      
      if (results.rows && records.length) {
        for (i = 0; i < results.rows.length; i++) {
          var rowid = records[i].rowid;
          var record = {};
          Ext.each(fields, function(f) {
            if (f.getType().type.toUpperCase() == 'AUTO') {
              record[f.getName()] =
                Ext.decode(Ext.isDefined(records[i][f.getName()])
                ? records[i][f.getName()] : null);
            } else {
              record[f.getName()] =
                Ext.isDefined(records[i][f.getName()])
                ? records[i][f.getName()] : null;
            }
          });
          
		      storedatas.push(new Model(record, rowid));
        }
      }
	    
      //me.applyData(storedatas, operation, callback, scope);

      me.setTotal(storedatas, operation, callback, scope);
    },
    
    
    
    /* FUNCTIONS THAT RETURN FUNCTIONS TO BE CALLED IN TRANSACTIONS */
    
    getInsertRecordFunc: function(record, tablename) {
    
      var me = this,
      rawData = me.getRecordDbObject(record),
      fields = [],
      values = [],
      placeholders = [],
      
      onSuccess = function(tx, rs) {
        var insertId = rs.insertId;
        
        if (record.phantom) {
          record.phantom = false;
        }
        
        // set the id
        record.setId(insertId);
      },

      onError = function(tx, err) {
        me.throwDbError(tx, err);
      };

      ////console.log(rawData);
      
      //extract data to be inserted
      for (var i in rawData) {
        fields.push(i);
        values.push(rawData[i]);
        placeholders.push('?');
      }

      //values[0] = null;
      
      var sql = 'INSERT INTO ' + tablename + '(' + fields.join(',') +
        ') VALUES (' + placeholders.join(',') + ')';

      ////console.log(sql);
      ////console.log(values);
      
      return function(tx) {
        tx.executeSql(sql, values, onSuccess, onError);
      };
    },
    
    getUpdateRecordFunc: function(record, tablename) {
      
      var me = this,
      id = record.getId(),
      newData = me.getRecordDbObject(record),
      pairs = [],
      values = [],
      
      onSuccess = function(tx, rs) {
        //add new record if id doesn't exist
        if (rs.rowsAffected == 0) {
          me.getInsertRecordFunc(record, tablename)();
        }
      },
      
      onError = function(tx, err) {
        me.throwDbError(tx, err);
      };

      for (var i in newData) {
        pairs.push(i + ' = ?');
        values.push(newData[i]);
      }

      values.push(record.getId());
      
      var sql = 'UPDATE ' + tablename + ' SET ' + pairs.join(',') +
        ' WHERE _ROWID_ = ?';

      ////console.log(sql);
      
      return function(tx) {
        tx.executeSql(sql, values, onSuccess, onError);
      };
      
    },
    
    getDeleteRecordFunc: function(record, tablename) {
      
      var me = this,
      values = [],
      
      onSuccess = function(tx, rs) {},
      
      onError = function(tx, err) {
        me.throwDbError(tx, err);
      };
      
      var sql = 'DELETE FROM ' + tablename + ' WHERE _ROWID_ = ?';
      values.push(record.getId());
      
      return function(tx) {
        tx.executeSql(sql, values, onSuccess, onError);
      };
    }
});