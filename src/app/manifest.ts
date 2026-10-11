import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'三泰通進銷存管理系統',short_name:'三泰通',lang:'zh-Hant',start_url:'/erp',scope:'/',display:'standalone',background_color:'#f3f5f7',theme_color:'#173f35',icons:[{src:'/app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};}
