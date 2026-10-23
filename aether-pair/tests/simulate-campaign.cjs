// Compatibility entry point for the previous development helper.
const search=require('./search-v3.cjs');
module.exports=search;
if(require.main===module)console.log(JSON.stringify(search('balanced'),null,2));
