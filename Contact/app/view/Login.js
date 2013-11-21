/*
 * File: app/view/Login.js
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

Ext.define('Contact.view.Login', {
    extend: 'Ext.form.Panel',
    alias: 'widget.loginform',

    config: {
        padding: '10px',
        styleHtmlContent: true,
        items: [
            {
                xtype: 'toolbar',
                docked: 'top',
                title: 'Login'
            },
            {
                xtype: 'label',
                hidden: true,
                hideAnimation: 'fadeOut',
                html: 'Por favor, entre com as credenciais corretas',
                itemId: 'failmsg',
                showAnimation: 'fadeIn',
                style: 'color: #990000; margin:5px 0px;'
            },
            {
                xtype: 'fieldset',
                title: 'Login',
                items: [
                    {
                        xtype: 'textfield',
                        itemId: 'user',
                        required: true,
                        placeHolder: 'usuário'
                    },
                    {
                        xtype: 'passwordfield',
                        itemId: 'pass',
                        required: true,
                        placeHolder: 'senha'
                    }
                ]
            },
            {
                xtype: 'button',
                itemId: 'loginbtn',
                margin: 20,
                ui: 'action-round',
                text: 'Entrar'
            }
        ]
    },

    showSignInFailedMessage: function(message) {
        var label = this.down('#failmsg');
        label.setHtml(message);
        label.show();
    }

});