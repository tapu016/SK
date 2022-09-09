/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search','N/task'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search,task) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try{

                const strMrScriptId = 'customscript_sk_mr_create_if_n_cs';
                const strMrScriptDeployment = 'customdeploy_sk_mr_create_if_n_cs';
                let intRecType = scriptContext.request.parameters.recType;
                let intSoId = scriptContext.request.parameters.soId;
                let intItemId = scriptContext.request.parameters.itemId;
                let intTrackingId = scriptContext.request.parameters.trackingId;
                let intShipViaId = scriptContext.request.parameters.shipViaId;
                let intQty = scriptContext.request.parameters.quantity;
                let intLocation = scriptContext.request.parameters.location;
                log.debug({title:'intSoId',details:intSoId})
                if(intRecType=='customrecord_playa_rma_receipt_itm_detls')
                {
                    let objRecord = record.create({type: 'customrecord_playa_rma_receipt_itm_detls',isDynamic: true});
                    objRecord.setValue({fieldId:'custrecord_returnparentsalesorder',value:intSoId})
                    objRecord.setValue({fieldId:'custrecord_playa_rma_receipt_itm',value:intItemId})
                    objRecord.setValue({fieldId:'custrecord_playa_rma_receipt_loc',value:intLocation})
                    objRecord.setValue({fieldId:'custrecord_playa_receipt_qty',value:intQty})
                    let intImportIfId = objRecord.save({enableSourcing: true,ignoreMandatoryFields: true});
                    log.debug({title:'CUSTOM RMA RECEIPT ITEM DETAILS',details:intImportIfId})  
                }
                else if(intRecType=='customrecord_skims_if_import' && intSoId)
                {
                    let objRecord = record.create({type: 'customrecord_skims_if_import',isDynamic: true});
                    objRecord.setValue({fieldId:'custrecord_skims_if_import_so',value:intSoId})
                    objRecord.setValue({fieldId:'custrecord_skims_if_import_item',value:intItemId})
                    objRecord.setValue({fieldId:'custrecord_skims_if_import_tracking',value:intTrackingId})
                    objRecord.setValue({fieldId:'custrecord_skims_if_import_shipvia',value:intShipViaId})
                    objRecord.setValue({fieldId:'custrecord_skims_if_import_qty',value:intQty})
                    let intImportIfId = objRecord.save({enableSourcing: true,ignoreMandatoryFields: true});
                    log.debug({title:'intImportIfId',details:intImportIfId})  
                    
                let mrTask = task.create({taskType: task.TaskType.MAP_REDUCE,scriptId:strMrScriptId,deploymentId:strMrScriptDeployment,params: {'custscript_im_if_id': intImportIfId}});
                    let mrTaskId = mrTask.submit();
                }
                else
                {
                    return 'No Sales Order Id Found'
                }
            }
            catch(e)
            {
                log.error({title:'Error',details:e.message})
            }                        
        }

        return {onRequest}

    });
