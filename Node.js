```const hubspot = require('@hubspot/api-client');

exports.main = async (event, callback) => {

  const hubspotClient = new hubspot.Client({
    accessToken: process.env.hstoken
  }); 
  
try {
  
  //hs_object_id is the record ID for the quote in this workflow. 
  const hs_object_id = event.inputFields['hs_object_id'];
  //first, reach out to the associations API to get the line items associated with the quote. 
  const apiResponse = await hubspotClient
              .apiRequest({
              method: 'GET',
              path: `/crm/v4/objects/quotes/${hs_object_id}/associations/line_item`,
              body: {}
            });

  //return the line item IDs associated with the quote, and map them to an array  
  const lineitemIDs = apiResponse.body.results.map( resultItem => `{"id": "${resultItem.toObjectId}"}` );
  console.log("Here are the line items associated with the quote from the associations API:", lineitemIDs); 
  //rebuild the array without the extra single apostrophes
  var cleanedLineItemIDs = lineitemIDs.join(',').replace(/'([^']+(?='))'/g, '$1');
  console.log("Here are the line item IDs to submit to the line items batch read API:", cleanedLineItemIDs);
  //submit our new array of line item IDs to the line items batch API
  var testLineItemIDs = `[`+cleanedLineItemIDs+`]`
  console.log("Here are the line item IDs with brackets:", testLineItemIDs)
  const apiResponse2 = await hubspotClient
  			.apiRequest({
            method: 'POST',
            path: `/crm/v3/objects/line_items/batch/read?archived=false`,
            //header: 'content-type: application/json',
            body: {
                  "properties": [
                    "hs_sku"
                  ],
                  "inputs": JSON.parse(testLineItemIDs)
                }
            });
  console.log (apiResponse2.body.results);
  //map the hs_sku properties returned by the line items API to an array
  const lineItemResponse = apiResponse2.body.results.map( id => id.properties.hs_sku);
  console.log("Here are the SKUs ", lineItemResponse);
  //rebuild the array to remove extraneous characters. 
  var cleanedSKUs = lineItemResponse.join(', ').replace(/'([^']+(?='))'/g, '$1');
  console.log("Here is the list of SKUs from the quote ", cleanedSKUs)
  //catch and log any errors to the console. 
} catch (e) {
  e.message === 'HTTP request failed'
    ? console.error(JSON.stringify(e.response, null, 2))
    : console.error(e)
}
  //return the list of SKUs for the line items on the quote so we can copy that to a property on the company record associated with the quote. 
  callback({ outputFields: {cleanedSKUs} });  
}
