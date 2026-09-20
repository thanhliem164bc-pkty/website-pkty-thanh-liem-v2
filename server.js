const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "thanhliem2026";

const publicDir = __dirname;
const dbDir = path.join(__dirname, "data");
const dbFile = path.join(dbDir, "site.json");
const appointmentsFile = path.join(dbDir, "appointments.json");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {recursive:true});
const upload = multer({dest: uploadsDir});
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, {recursive:true});
if (!fs.existsSync(appointmentsFile)) fs.writeFileSync(appointmentsFile, "[]");

const defaults = {
  name:"PHÒNG KHÁM THÚ Y PKTY THANH LIÊM",
  phone:"0938 848 238",
  zalo:"https://zalo.me/0938848238",
  facebook:"https://www.facebook.com/profile.php?id=61593452407647&locale=vi_VN",
  address:"128 Lê Thị Hà, Xã Hóc Môn, TP.HCM",
  maps:"https://maps.app.goo.gl/1pYxKcbj68PE8qyX8",
  heroTitle:"Người bạn nhỏ, luôn được yêu thương.",
  heroText:"",
  about:"",
  bookingText:"",
  services:["Điều trị thú cưng","Tiêm phòng","Spa thú cưng","Petshop"],
  spa:[]
};
function readDB(){
  try { return {...defaults, ...JSON.parse(fs.readFileSync(dbFile,"utf8"))}; }
  catch(e){ fs.writeFileSync(dbFile, JSON.stringify(defaults,null,2)); return {...defaults}; }
}
function writeDB(d){ fs.writeFileSync(dbFile, JSON.stringify(d,null,2)); }

app.use(express.json({limit:"1mb"}));
// API responses must not be cached. Otherwise Express can return 304 with an empty body,
// which breaks frontend JSON parsing for /api/me and other API calls.
app.use("/api", (req,res,next)=>{
  res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma","no-cache");
  res.set("Expires","0");
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || "thanh-liem-change-this-secret",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production"}
}));

function auth(req,res,next){
  if(req.session && req.session.admin) return next();
  res.status(401).json({error:"Chưa đăng nhập"});
}

app.get("/api/site", (req,res)=>res.json(readDB()));
app.post("/api/login",(req,res)=>{
  const {username,password}=req.body||{};
  if(username===ADMIN_USER && password===ADMIN_PASS){
    req.session.admin=true; return res.json({ok:true});
  }
  res.status(401).json({error:"Sai tài khoản hoặc mật khẩu"});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({loggedIn:!!(req.session&&req.session.admin)}));
app.put("/api/site", auth, (req,res)=>{
  const d={...defaults,...req.body};
  writeDB(d); res.json(d);
});

// ===== Appointment APIs =====
function readAppointments(){
  try {
    const raw=fs.readFileSync(appointmentsFile,"utf8");
    const data=JSON.parse(raw);
    return Array.isArray(data)?data:[];
  } catch(e){
    return [];
  }
}
function writeAppointments(list){
  fs.writeFileSync(appointmentsFile, JSON.stringify(list,null,2));
}
function makeId(){
  return Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}

app.post("/api/appointments", (req,res)=>{
  const body=req.body||{};
  const required=["ownerName","phone","petName","date","time"];
  const missing=required.filter(k=>!String(body[k]||"").trim());
  if(missing.length){
    return res.status(400).json({error:"Vui lòng điền đầy đủ thông tin đặt lịch."});
  }
  const appointment={
    id:makeId(),
    ownerName:String(body.ownerName||"").trim(),
    phone:String(body.phone||"").trim(),
    petName:String(body.petName||"").trim(),
    petType:String(body.petType||"").trim(),
    service:String(body.service||"").trim(),
    date:String(body.date||"").trim(),
    time:String(body.time||"").trim(),
    note:String(body.note||"").trim(),
    status:"Mới",
    createdAt:new Date().toISOString()
  };
  const list=readAppointments();
  list.push(appointment);
  writeAppointments(list);

  // Optional webhook notification. A failure here must not make booking fail.
  const settings=readDB();
  if(settings.notifyEnabled && settings.notifyWebhook){
    try{
      const url=new URL(settings.notifyWebhook);
      const payload=JSON.stringify({content:`📅 Lịch hẹn mới tại PKTY Thanh Liêm\nKhách: ${appointment.ownerName}\nSĐT: ${appointment.phone}\nThú cưng: ${appointment.petName}\nNgày giờ: ${appointment.date} ${appointment.time}\nDịch vụ: ${appointment.service||"Chưa chọn"}`});
      const https=require(url.protocol==="https:"?"https":"http");
      const request=https.request({hostname:url.hostname,port:url.port||undefined,path:url.pathname+url.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(payload)}},()=>{});
      request.on("error",()=>{}); request.write(payload); request.end();
    }catch(e){}
  }
  res.status(201).json({ok:true,appointment});
});

app.get("/api/appointments", auth, (req,res)=>{
  const list=readAppointments().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json(list);
});

app.put("/api/appointments/:id", auth, (req,res)=>{
  const list=readAppointments();
  const item=list.find(x=>x.id===req.params.id);
  if(!item) return res.status(404).json({error:"Không tìm thấy lịch hẹn"});
  if(req.body && req.body.status) item.status=String(req.body.status);
  writeAppointments(list);
  res.json(item);
});

app.delete("/api/appointments/:id", auth, (req,res)=>{
  const list=readAppointments();
  const next=list.filter(x=>x.id!==req.params.id);
  if(next.length===list.length) return res.status(404).json({error:"Không tìm thấy lịch hẹn"});
  writeAppointments(next);
  res.json({ok:true});
});

app.get("/api/dashboard", auth, (req,res)=>{
  const list=readAppointments();
  const today=new Date().toISOString().slice(0,10);
  const todayCount=list.filter(x=>x.date===today).length;
  const newCount=list.filter(x=>x.status==="Mới").length;
  const confirmed=list.filter(x=>x.status==="Đã xác nhận").length;
  const upcoming=list
    .filter(x=>x.date && x.date>=today && x.status!=="Đã hủy")
    .sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0,10);
  res.json({today:todayCount,newCount,confirmed,total:list.length,upcoming});
});

app.get("/api/settings", auth, (req,res)=>{
  const d=readDB();
  res.json({notifyWebhook:d.notifyWebhook||"",notifyEnabled:!!d.notifyEnabled});
});
app.put("/api/settings", auth, (req,res)=>{
  const d=readDB();
  d.notifyWebhook=String(req.body?.notifyWebhook||"").trim();
  d.notifyEnabled=!!req.body?.notifyEnabled;
  writeDB(d);
  res.json({notifyWebhook:d.notifyWebhook,notifyEnabled:d.notifyEnabled});
});

app.post("/api/upload", auth, upload.single("image"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"Chưa chọn ảnh"});
  const ext=path.extname(req.file.originalname||"").toLowerCase() || ".jpg";
  const safeExt=/^\.(jpg|jpeg|png|webp|gif)$/i.test(ext)?ext:".jpg";
  const filename=`gallery-${Date.now()}${safeExt}`;
  const dest=path.join(uploadsDir,filename);
  fs.renameSync(req.file.path,dest);
  res.json({ok:true,url:`/uploads/${filename}`,filename});
});

app.use("/admin", express.static(path.join(__dirname,"admin")));
app.use(express.static(publicDir));

// Keep API errors JSON instead of falling through to HTML/SPA pages.
app.use("/api", (req,res)=>res.status(404).json({error:"API không tồn tại"}));

app.listen(PORT, ()=>console.log(`Thanh Liem website running on port ${PORT}`));
