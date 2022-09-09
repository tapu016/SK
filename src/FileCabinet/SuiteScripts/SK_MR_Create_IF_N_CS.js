/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search','N/runtime','./SK_Common.js'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search,runtime,com) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            let intImIFId = runtime.getCurrentScript().getParameter({name: 'custscript_im_if_id'});
            log.debug({title:'intImIFId',details:intImIFId});  
            let arrItemIds = '';
            if(intImIFId)
                arrItemIds = intImIFId.split(',');
            
            log.debug({title:'arrItemIds',details:arrItemIds});  
                                            
            /*
            const searchRecType = 'customrecord_skims_if_import';
            let searchCustomerFilters = new Array();                  
                searchCustomerFilters.push(search.createFilter({name: 'custrecord_skims_if_import_if',operator: search.Operator.ANYOF,values:'@NONE@'}));
                searchCustomerFilters.push(search.createFilter({name: 'status',join:'custrecord_skims_if_import_so',operator: search.Operator.ANYOF,values:['']}));
            var searchCustomerColumns = new Array();
                searchCustomerColumns.push(search.createColumn({ name: "internalid"}));   
            var itemSearchResult = com.searchAllRecord(searchRecType, null, searchCustomerFilters, searchCustomerColumns);
            var listRecordsFields = [];
            var itemResult = com.pushSearchResultIntoArray(itemSearchResult,listRecordsFields);
            */
           return arrItemIds;

        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {

        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            log.debug({title:'reduceContext',details:reduceContext});   
            let intImIFId = reduceContext.values[0];
            log.debug({title:'intImIFId',details:intImIFId});          
            try
            {                
                log.debug({title:'intImIFId',details:intImIFId})
                if(intImIFId)
                {
                    let objImIf = record.load({type: 'customrecord_skims_if_import',id:intImIFId,isDynamic: true});
                    let intSoId = objImIf.getValue({fieldId:'custrecord_skims_if_import_so'});
                    let intFulfillItemId = objImIf.getValue({fieldId:'custrecord_skims_if_import_item'});
                    let intFulfillQty = objImIf.getValue({fieldId:'custrecord_skims_if_import_qty'});
                    let intIfId = fulfillOrder(intSoId,intFulfillItemId,intFulfillQty);
                    log.debug({title:'intIfId',details:intIfId})
                }
            }
            catch(e)
            {
                log.error({title:'Error',details:e.message})
            }    

        }

        const fulfillOrder = (intSoId,intFulfillItemId,intFulfillQty)=>{
            
            let objFulfill = record.transform({fromType: record.Type.SALES_ORDER,fromId: intSoId,toType:record.Type.ITEM_FULFILLMENT,isDynamic: true })
                objFulfill.setValue({fieldId:'shipstatus',value:'C'});
            let intLineCount = objFulfill.getLineCount({sublistId:'item'});
            
            for(let iterateLine = 0;iterateLine<intLineCount;iterateLine++)
            {   
                objFulfill.selectLine({sublistId: 'item',line: iterateLine});
                objFulfill.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false });
                objFulfill.commitLine({sublistId: 'item'}); 
            }

            let lineNumber = objFulfill.findSublistLineWithValue({sublistId: 'item',fieldId: 'item',value:intFulfillItemId});
            if(lineNumber>-1)
            {
                objFulfill.selectLine({sublistId: 'item',line: lineNumber});
                objFulfill.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
                objFulfill.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value:intFulfillQty});
                objFulfill.commitLine({sublistId: 'item'}); 
                var intIfId = objFulfill.save({ignoreMandatoryFields: true})
                if(intIfId)
                    createCashSale(intSoId,intFulfillItemId,intFulfillQty)                                                                               
            }            
            log.debug({ title: 'Fulfillment Created', details: intIfId })
            return intIfId;
        }

        const createCashSale = (intSoId,intFulfillItemId,intFulfillQty)=>{

            var objCashSale = record.transform({fromType: record.Type.SALES_ORDER,fromId: intSoId,toType: record.Type.CASH_SALE,isDynamic: true,});
            let intLineCount = objCashSale.getLineCount({sublistId:'item'});
            let intItemLineNum = objCashSale.findSublistLineWithValue({sublistId: 'item',fieldId: 'item',value:intFulfillItemId});
            if(intItemLineNum>-1)
            {
                for(let iterateLine = 0;iterateLine<intLineCount;iterateLine++)
                {   
                    objCashSale.selectLine({sublistId: 'item',line: iterateLine});
                    if(intItemLineNum==iterateLine)
                    {
                        objCashSale.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value:intFulfillQty});
                    }
                    else
                    {
                        objCashSale.removeCurrentSublistSubrecord({sublistId: 'item',fieldId: 'item'});
                    }                            
                    objCashSale.commitLine({sublistId: 'item'}); 
                }
            }                    
            let intCashSaleId = objCashSale.save({ignoreMandatoryFields: true});
            log.debug({title:'intCashSaleId',details:intCashSaleId})
        }

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return {getInputData, reduce, summarize}

    });
