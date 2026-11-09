// Data compilation only: avoid os.userInfo(), unavailable in this Windows sandbox.
const os=require('node:os');
os.userInfo=()=>({username:'calendar-data-compiler',homedir:__dirname,shell:null,uid:0,gid:0});
require('../sources/CeJS/_for include/node.loader.js');
CeL.set_debug(0);
CeL.env.era_data_load=(country,queue)=>{
  if(typeof country==='object') queue.splice(0,queue.length,'中國');
  if(!queue){
    const list=Array.from(CeL.era('中國',{get_era_list:true}));
    console.log('LOADED',typeof list,Array.isArray(list),list.length);
    const samples=[list[0],...list.filter(x=>/洪武|建興|景泰|崇禎|顯道/.test(x.name[0])).slice(0,12)];
    for(const x of samples){
      x.initialize();const i=x.Date_to_date_index(x.start);
      console.log(JSON.stringify({name:x.name,start:x.start,sj:x.start_JDN,end:x.end,ej:x.end_JDN,keys:Object.keys(x),ys:x.year_start.slice(0,3),i,yn:x.歲名(0),mn:x.月名(0,0),dn:x.日名(0,0,0),first:x.calendar[0]}));
    }
    console.log('DYNASTIES',[...new Set(list.map(e=>e.name[2]))].join('、'));
  }
};
CeL.run('data.date.era',()=>console.log('ENGINE',typeof CeL.era,CeL.env.library_base_path));
