/*
 * File: app/view/Info.js
 *
 * This file was generated by Sencha Architect version 3.0.0.
 * http://www.sencha.com/products/architect/
 *
 * This file requires use of the Sencha Touch 2.3.x library, under independent license.
 * License of Sencha Architect does not include license for Sencha Touch 2.3.x. For more
 * details see http://www.sencha.com/license or contact license@sencha.com.
 *
 * This file will be auto-generated each and everytime you save your project.
 *
 * Do NOT hand edit this file.
 */

Ext.define('Contact.view.Info', {
    extend: 'Ext.form.Panel',
    alias: 'widget.contactinfo',

    requires: [
        'Contact.view.Picture'
    ],

    config: {
        padding: '10px',
        items: [
            {
                xtype: 'toolbar',
                docked: 'top',
                items: [
                    {
                        xtype: 'button',
                        itemId: 'infoBackBtn',
                        ui: 'back',
                        text: 'Voltar'
                    },
                    {
                        xtype: 'component',
                        flex: 1,
                        cls: 'contact-name',
                        html: 'First Name Last Name',
                        itemId: 'nameTxt'
                    },
                    {
                        xtype: 'button',
                        itemId: 'favoriteBtn',
                        iconCls: 'favorites',
                        text: ''
                    },
                    {
                        xtype: 'button',
                        id: '',
                        itemId: 'editContactBtn',
                        iconCls: 'compose',
                        text: ''
                    }
                ]
            },
            {
                xtype: 'contactpic'
            },
            {
                xtype: 'textfield',
                disabled: true,
                itemId: 'phoneNumber',
                clearIcon: false,
                label: 'Telefone',
                labelAlign: 'top',
                name: 'phoneNumber',
                readOnly: true
            },
            {
                xtype: 'textfield',
                disabled: true,
                itemId: 'emailAddress',
                clearIcon: false,
                label: 'Email',
                labelAlign: 'top',
                name: 'emailAddress',
                placeHolder: 'Email não informado',
                readOnly: true
            },
            {
                xtype: 'textfield',
                disabled: true,
                id: 'address',
                clearIcon: false,
                label: 'Endereço',
                labelAlign: 'top',
                name: 'address',
                placeHolder: 'Endereço não informado',
                readOnly: true
            }
        ],
        listeners: [
            {
                fn: 'onFavoriteBtnTap',
                event: 'tap',
                delegate: '#favoriteBtn'
            }
        ]
    },

    onFavoriteBtnTap: function(button, e, eOpts) {
        var pressingCls = 'x-button-pressed';
        button.element.toggleCls(pressingCls);
        var isPressed = button.element.hasCls(pressingCls);
        var record = this.getRecord();
        record.set('isFavorite', isPressed);
    },

    setRecord: function(record) {
        this.callParent(arguments);
        if (record) {
            var name = record.get('firstName') + ' ' + (record.get('lastName') || '');
            var isFavorite = record.get('isFavorite');
            this.down('#nameTxt').setHtml(name);
            this.down('#favoriteBtn')[isFavorite ? 'addCls' : 'removeCls']('x-button-pressed');
            this.down('contactpic').setData(record.data);
        }
    }

});