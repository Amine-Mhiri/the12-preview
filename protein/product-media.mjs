/** Product photos remain attached to the exact retailer reference. */
// Visually checked 20 Oct 2026: this supplied gallery image contains the
// ingredients/nutrition panel for CGN Very Vanilla 5 lb, iHerb 82707.
const verifiedLabels={82707:'https://cloudinary.images-iherb.com/image/upload/images/cgn/cgn01205/l/53.jpg'};
const safeImage=value=>{
 if(typeof value!=='string')return null;
 try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return /^\/(?!\/)/.test(value)?value:null;}
};
export function productMedia(v){
 const gallery=[...new Set([v.image,...(Array.isArray(v.gallery)?v.gallery:[])].map(safeImage).filter(Boolean))];
 const declared=safeImage(v.label_image?.url),checked=verifiedLabels[v.merchant_ref];
 const label=declared||(checked&&gallery.includes(checked)?checked:null);
 if(label&&!gallery.includes(label))gallery.push(label);
 return {gallery,label};
}
