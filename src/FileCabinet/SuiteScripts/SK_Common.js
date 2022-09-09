/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
 define(['N/search','N/record'], function(search,record){
 
	//Function to search Item Receipt for all items present in vendor bill
	function searchAllRecord(recordType,searchId,searchFilter,searchColumns)
	{		
		try 
		{	
			var arrSearchResults =[];
			var count = 1000,min = 0,max = 1000;
			var searchObj = false;
			
			if(!recordType)
				recordType=null;
			
			if (searchId) 
			{
				searchObj = search.load({id : searchId});
				if (searchFilter)
					searchObj.addFilters(searchFilter);
				
				if (searchColumns)
					searchObj.addColumns(searchColumns);
			}
			else
				searchObj = search.create({type:recordType,filters:searchFilter,columns:searchColumns})
			
			var rs = searchObj.run();			
			//searchColumns.push(rs.columns);
			//allColumns = rs.columns;
		
			while (count == 1000) 
			{
				var resultSet = rs.getRange({start : min,end :max});											
				if(resultSet!=null)
				{
					arrSearchResults = arrSearchResults.concat(resultSet);
					min = max;
					max += 1000;
					count = resultSet.length;
				}
			}
		} 
		catch (e) 
		{
			log.debug( 'Error searching for Customer:- ', e.message);
		}
		return arrSearchResults;
	}
	
	//Function to convert search result set into JSON object array
	function pushSearchResultIntoArray(searchResultSet,listRecordsFields)
	{
		var arrayList = new Array();
		for(var iterate in searchResultSet)
		{
			var resultObj = {};
			var cols = searchResultSet[0].columns;
			resultObj['type'] = searchResultSet[iterate].recordType;
			resultObj['internalid'] = searchResultSet[iterate].id;
			for(var coliterate in cols)
			{
				var prop;
				var isListRecord;
				if(cols[coliterate].label)
				  {
					prop = cols[coliterate].label;
					
					if(listRecordsFields)
						isListRecord = listRecordsFields.indexOf(prop)
				  }
				else
				  {
					prop = cols[coliterate].name; 
					
					if(listRecordsFields)
						isListRecord = listRecordsFields.indexOf(prop)
				  }
			
			  if(isListRecord>=0)
			  {
				resultObj[prop]= (searchResultSet[iterate].getValue({name:cols[coliterate]})).toString();
				resultObj[prop+'_txt']= (searchResultSet[iterate].getText({name:cols[coliterate]})).toString();
			  }
			  else
			  {
				  resultObj[prop]= (searchResultSet[iterate].getValue({name:cols[coliterate]})).toString();
			  }
			  
			}
			arrayList.push(resultObj);
		}
		return arrayList;
	}	
 
	return{
	searchAllRecord:searchAllRecord,
	pushSearchResultIntoArray:pushSearchResultIntoArray,
 };
 })