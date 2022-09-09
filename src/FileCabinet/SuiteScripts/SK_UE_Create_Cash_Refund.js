/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record','N/search'],
    /**
 * @param{record} record
 */
    (record,search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            try{            
            if(scriptContext.type==scriptContext.UserEventType.CREATE)
            {
                let objIr = scriptContext.newRecord;
                let intCreatedFrom = objIr.getValue({fieldId:'createdfrom'});
                log.debug({title:'intCreatedFrom',details:intCreatedFrom})
                let mySearch = search.create({
                    type: search.Type.TRANSACTION,
                    columns: ['internalid', 'type'],
                    filters: [['mainline', 'is', 'T'],'and', ['internalid', 'anyof', intCreatedFrom]]
                });
            
                let myResultSet = mySearch.run();
                let resultRange = myResultSet.getRange({start: 0,end: 1000});
                log.debug({title:'resultRange',details:resultRange})
                if(resultRange.length>0)
                {
                    let result = resultRange[0];
                    let strCreatedFromRecType = result.getValue({name:'type'});
                    log.debug({title:'strCreatedFromRecType',details:strCreatedFromRecType})
                    if(strCreatedFromRecType=='RtnAuth')
                    {
                        let objCrRec = record.transform({fromType : record.Type.RETURN_AUTHORIZATION,fromId : intCreatedFrom,toType : record.Type.CASH_REFUND,isDynamic: true});
                        const intCrId = objCrRec.save({ignoreMandatoryFields: true});
                        log.debug({title:'intCrId',details:intCrId})
                    }
                }
    
            }
        }
        catch(e)
        {
            log.error({title:'Error in reduce',details:e.message})
        }
                    }

        return {afterSubmit}

    });
