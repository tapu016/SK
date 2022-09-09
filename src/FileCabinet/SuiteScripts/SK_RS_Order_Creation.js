/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
/*****************************************************************************
 *  * Copyright (c) 2022 - Present Skims - All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Skims. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered with Crowe LLp.
*
* FILE NAME: SK_RS_Order_Creation.js
* DEVOPS TASK: SK Order Creation
* AUTHOR: Tapendra Pratap Singh
* DATE CREATED: 02/01/2022
* DESCRIPTION: This script is responsible Creating Sales order from postman request.
*
* REVISION HISTORY
* Date          DevOps item No.    By                      Issue Fix Summary
* =============================================================================================
*   
*
*****************************************************************************/
define(['N/record', 'N/search','./SK_Common.js'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search,com) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {

        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {
            let objOrder = requestBody.order;
            const intOrderId = objOrder.id;

            /*  Assumption that this is new Order which is not present in NetSuite.
                Can add lookup to check the external id is present or not for duplicate detection or update existing
            */
            if(intOrderId)
            {      
                const objHeaderFieldMapping = {'entity':'customer.id','externalid':'id','custbody_order_source_name':'source_name'}
                var objRecord = record.create({type : record.Type.SALES_ORDER,isDynamic : true});
                setFields(objRecord,'',objHeaderFieldMapping,objOrder);
                const objBillAddress = objOrder.billing_address;
                const objShipAddress = objOrder.shipping_address; 
                const objAddrMapping = {'country':'country_code','addressee':'name','addrphone':'shipPhone',
                                                'addr1':'address1','addr2':'address2','city':'city','state':'province_code',
                                                'zip':'zip'}            
                setFields(objRecord,'billingaddress',objAddrMapping,objBillAddress);
                setFields(objRecord,'shippingaddress',objAddrMapping,objShipAddress);
                const arrObjlineItems = objOrder.line_items;                
                const objItemSubFieldsMapping = {'item':'sku','quantity':'quantity'};
                setSublistFields(objRecord,'item',objItemSubFieldsMapping,arrObjlineItems)
                try 
                {
                var recordId = objRecord.save({enableSourcing : false,ignoreMandatoryFields : false});
                    if(recordId)
                    {
                        /*Create Fulfillment Import Record*/
                        record.create({type:'customrecord_skims_if_import',isDynamic : true})
                    }
                }
                catch (e) 
                {
                    log.error({title:'Error while saving order',details:e});
                }
            }
            else
            {
                log.error({title:'Order Id not Found',details:objOrder});
            }           
        }

        const setFields = (ObjRecord,strSubRecId,objFieldsMapping,objPayload)=>
		{
            try 
			{                             
                if (Object.keys(objFieldsMapping).length > 0 && Object.keys(objPayload).length > 0) 
				{
                    ObjRecord = strSubRecId ? ObjRecord.getSubrecord({fieldId:strSubRecId}) : ObjRecord;                
                    const fieldIds = Object.keys(objFieldsMapping);
                    if(fieldIds.length > 0)
                    {
                        for(let fieldId in objFieldsMapping)
                        {
                            let fieldValue = '';
                            let checkJoinProp = objFieldsMapping[fieldId].split('.');

                            if(checkJoinProp.length > 1)
                                fieldValue = getJoinValueFromPayload(checkJoinProp,objPayload) || '';
                            else
                                fieldValue = objPayload[objFieldsMapping[fieldId]] || '';

                            if(fieldId=='entity' && fieldValue)
                            {
                                /**Create search for RMA which have credit RMA applied and status as pending Receipt*/    
                                const searchRecType = 'customer';
                                let searchCustomerFilters = new Array();					
                                    searchCustomerFilters.push(search.createFilter({name: 'custentity_celigo_etail_cust_id',operator: search.Operator.IS,values: fieldValue}));					
                                        
                                var searchCustomerColumns = new Array();
                                    searchCustomerColumns.push(search.createColumn({ name: "internalid"}));                    

                                var famAssetSearchResult = com.searchAllRecord(searchRecType, null, searchCustomerFilters, searchCustomerColumns);
                                var listRecordsFields = [];
                                //log.debug({title:'relatedIrSearchResult',details:JSON.stringify(relatedIrSearchResult)})
                                var custResult = com.pushSearchResultIntoArray(famAssetSearchResult,listRecordsFields);
                                if(custResult.length > 0)
                                {
                                    ObjRecord.setValue({fieldId: fieldId,value: custResult[0].internalid}); 
                                }
                            }
                            else
                            {
                                ObjRecord.setValue({fieldId: fieldId,value: fieldValue});  
                            }                                                                                                                                                                               
                        }
                    }                    
                }
                else 
                {
                    log.error({title:'Order Id not Found',details:objOrder})
                }
            }
            catch (e) 
			{
                log.error({title:'Error in setFields',details:e})
            }
        }

        const setSublistFields = (ObjRecord,strSublistId,objFieldsMapping,arrObjPayload)=>
        {         
            const arrItemSku = new Array();
            for(let iterateLineItem in arrObjPayload)
            {
                    let ObjlineItem = arrObjPayload[iterateLineItem];
                    arrItemSku.push(ObjlineItem.sku);
            }
            const searchRecType = 'item';
            let searchCustomerFilters = new Array();                  
                searchCustomerFilters.push(search.createFilter({name: 'externalid',operator: search.Operator.ANYOF,values: arrItemSku}));
            var searchCustomerColumns = new Array();
                searchCustomerColumns.push(search.createColumn({ name: "internalid"}));   
                searchCustomerColumns.push(search.createColumn({ name: "externalid"}));
            var itemSearchResult = com.searchAllRecord(searchRecType, null, searchCustomerFilters, searchCustomerColumns);
            var listRecordsFields = [];
            var itemResult = com.pushSearchResultIntoArray(itemSearchResult,listRecordsFields);
            try 
			{
                for(let iterateLineItem in arrObjPayload)
                {
                    let ObjlineItem = arrObjPayload[iterateLineItem];
                    let strSku = ObjlineItem.sku;
                    let objItemId = itemResult.filter(function (e) {
                        return e.externalid == strSku;
                    });
                    let intItemId = objItemId[0].internalid;
                    ObjRecord.selectNewLine({sublistId: strSublistId});
                    const lineItemFields = Object.keys(objFieldsMapping);
                    const fieldIds = Object.keys(objFieldsMapping);
                    for(let fieldId in objFieldsMapping)
                    {                       
                        if(fieldId=='item')
                            ObjRecord.setCurrentSublistValue({sublistId: strSublistId,fieldId:fieldId,value: intItemId});
                        else
                            ObjRecord.setCurrentSublistValue({sublistId: strSublistId,fieldId:fieldId,value: ObjlineItem[objFieldsMapping[fieldId]]});
                    }                         
                    ObjRecord.commitLine({sublistId: 'item'});
                }
                log.error({title:'setSublistFields item Commit',details:'for Finished'}); 
            }
            catch (e) {
                log.error({title:'Error in setSublistFields',details:e}); 
            }
        }

        const getJoinValueFromPayload = (arrJoinProperty,objPayload)=>{

            let joinValue =objPayload;
            log.error({title:'getJoinValueFromPayload arrJoinProperty',details:arrJoinProperty});
            for(let iterate in arrJoinProperty)
            {    
                joinValue = joinValue[arrJoinProperty[iterate]];
            }
            fieldValue = joinValue;
            log.error({title:'getJoinValueFromPayload fieldValue',details:fieldValue});
            return fieldValue;
        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const deleteRequest = (requestParams) => {
        }

        return {post:post}
    });
