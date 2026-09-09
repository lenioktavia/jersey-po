import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, ShoppingBag, Receipt, CreditCard, WalletCards,
  BarChart3, Plus, Pencil, Trash2, Search, Menu, X, LogOut,
  AlertTriangle, CheckCircle2, ChevronDown, Printer, Loader2
} from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const years = Array.from({length: 11}, (_, i) => new Date().getFullYear() - 5 + i);
const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const dateOnly = d => d ? new Date(d+"T00:00:00").toLocaleDateString("id-ID") : "-";
const today = () => new Date().toISOString().slice(0,10);

function isLate(order) {
  return order.status === "belum_dikirim" && order.deadline && order.deadline < today();
}

const nav = [
  ["dashboard","Dashboard",LayoutDashboard],
  ["orders","Pesanan",ShoppingBag],
  ["expenses","Pengeluaran",Receipt],
  ["debts","Utang",CreditCard],
  ["balance","Saldo",WalletCards],
  ["reports","Laporan",BarChart3]
];

function App() {
  const now = new Date();
  const [page,setPage] = useState("dashboard");
  const [month,setMonth] = useState(now.getMonth()+1);
  const [year,setYear] = useState(now.getFullYear());
  const [session,setSession] = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [data,setData] = useState({orders:[],expenses:[],debts:[],balance:null});
  const [loading,setLoading] = useState(false);
  const [toast,setToast] = useState(null);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthLoading(false)});
    const {data:listener} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>listener.subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(session) loadAll(); },[session]);

  async function loadAll() {
    setLoading(true);
    const [o,e,d,b] = await Promise.all([
      supabase.from("orders").select("*").order("order_date",{ascending:false}),
      supabase.from("expenses").select("*").order("date",{ascending:false}),
      supabase.from("debts").select("*").order("date",{ascending:false}),
      supabase.from("balance").select("*").order("created_at",{ascending:false}).limit(1)
    ]);
    const err = [o,e,d,b].find(x=>x.error);
    if(err) showToast(err.error.message,"error");
    setData({orders:o.data||[],expenses:e.data||[],debts:d.data||[],balance:b.data?.[0]||null});
    setLoading(false);
  }

  function showToast(message,type="success") {
    setToast({message,type}); setTimeout(()=>setToast(null),2800);
  }

  if(authLoading) return <div className="center"><Loader2 className="spin"/> Memuat...</div>;
  if(!supabase) return <SetupPage/>;

  if(!session) return <Login onLogin={setSession} />;

  const filteredOrders = data.orders.filter(x=>{
    const d=x.order_date ? new Date(x.order_date+"T00:00:00") : null;
    return d && d.getMonth()+1===month && d.getFullYear()===year;
  });
  const filteredExpenses = data.expenses.filter(x=>{
    const d=x.date ? new Date(x.date+"T00:00:00") : null;
    return d && d.getMonth()+1===month && d.getFullYear()===year;
  });
  const filteredDebts = data.debts.filter(x=>{
    const d=x.date ? new Date(x.date+"T00:00:00") : null;
    return d && d.getMonth()+1===month && d.getFullYear()===year;
  });
  const sales = filteredOrders.reduce((a,x)=>a+Number(x.total||0),0);
  const expenses = filteredExpenses.reduce((a,x)=>a+Number(x.amount||0),0);
  const profit = sales-expenses;
  const adSpend = filteredExpenses.filter(x=>x.category==="Iklan").reduce((a,x)=>a+Number(x.amount||0),0);
  const unpaidDebt = data.debts.filter(x=>x.status==="belum_dibayar").reduce((a,x)=>a+Number(x.amount||0),0);
  const paidDebtPeriod = filteredDebts.filter(x=>x.status==="sudah_dibayar").reduce((a,x)=>a+Number(x.amount||0),0);
  const pending = data.orders.filter(x=>x.status==="belum_dikirim").length;
  const late = data.orders.filter(isLate).length;
  const endingBalance = Number(data.balance?.initial_balance||0)+sales-expenses-paidDebtPeriod;

  return <div className="app">
    <aside className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="brand"><div className="brandMark">J</div><div><b>Jersey Order</b><small>Manajemen Usaha</small></div><button className="iconBtn mobileClose" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?"active":""} onClick={()=>{setPage(id);setMobileOpen(false)}}><Icon size={19}/>{label}</button>)}</nav>
      <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/> Keluar</button>
    </aside>
    {mobileOpen && <div className="overlay" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="iconBtn mobileMenu" onClick={()=>setMobileOpen(true)}><Menu/></button>
        <div><h1>{nav.find(x=>x[0]===page)?.[1]}</h1><span className="muted">Kelola usaha jersey dengan sederhana</span></div>
        {page!=="orders" && page!=="expenses" && page!=="debts" && <PeriodFilter month={month} year={year} setMonth={setMonth} setYear={setYear}/>}
      </header>
      {loading && <div className="loadingBar"><Loader2 className="spin" size={16}/> Memuat data...</div>}
      {page==="dashboard" && <Dashboard sales={sales} expenses={expenses} profit={profit} pending={pending} late={late} unpaidDebt={unpaidDebt} endingBalance={endingBalance} orders={data.orders} />}
      {page==="orders" && <Orders orders={data.orders} reload={loadAll} toast={showToast}/>}
      {page==="expenses" && <Expenses expenses={data.expenses} reload={loadAll} toast={showToast}/>}
      {page==="debts" && <Debts debts={data.debts} reload={loadAll} toast={showToast}/>}
      {page==="balance" && <Balance balance={data.balance} sales={sales} expenses={expenses} paidDebt={paidDebtPeriod} ending={endingBalance} reload={loadAll} toast={showToast}/>}
      {page==="reports" && <Reports month={month} year={year} sales={sales} expenses={expenses} profit={profit} adSpend={adSpend} orders={filteredOrders} expensesData={filteredExpenses}/>}
    </main>
    {toast && <div className={"toast "+toast.type}>{toast.type==="success"?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>} {toast.message}</div>}
  </div>
}

function SetupPage(){return <div className="center"><div className="setup"><h2>Hubungkan Supabase</h2><p>Salin <b>.env.example</b> menjadi <b>.env</b>, lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dari project Supabase Anda.</p></div></div>}
function Login({onLogin}) {
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[err,setErr]=useState("");
  async function submit(e){e.preventDefault();setBusy(true);setErr("");const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)setErr(error.message);else onLogin(data.session);setBusy(false)}
  return <div className="auth"><form className="authCard" onSubmit={submit}><div className="brand centerBrand"><div className="brandMark">J</div></div><h2>Jersey Order</h2><p className="muted">Masuk untuk mengelola usaha</p><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary full" disabled={busy}>{busy?<Loader2 className="spin"/>:"Masuk"}</button>{err&&<div className="error">{err}</div>}</form></div>
}

function PeriodFilter({month,year,setMonth,setYear}){return <div className="period"><select value={month} onChange={e=>setMonth(+e.target.value)}>{months.map((m,i)=><option value={i+1} key={m}>{m}</option>)}</select><select value={year} onChange={e=>setYear(+e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></div>}

function Dashboard({sales,expenses,profit,pending,late,unpaidDebt,endingBalance,orders}){
  return <section>
    <div className="stats">
      <Stat title="Total Penjualan" value={money(sales)} icon={ShoppingBag}/>
      <Stat title="Total Pengeluaran" value={money(expenses)} icon={Receipt}/>
      <Stat title={profit>=0?"Laba":"Rugi"} value={money(Math.abs(profit))} icon={BarChart3} tone={profit<0?"danger":"good"}/>
      <Stat title="Saldo" value={money(endingBalance)} icon={WalletCards}/>
      <Stat title="Belum Dikirim" value={pending+" pesanan"} icon={ShoppingBag}/>
      <Stat title="Terlambat" value={late+" pesanan"} icon={AlertTriangle} tone={late?"danger":"good"}/>
      <Stat title="Utang Belum Dibayar" value={money(unpaidDebt)} icon={CreditCard} tone={unpaidDebt?"danger":"good"}/>
    </div>
    <div className="panel"><div className="panelHead"><div><h3>Pesanan yang Perlu Diperhatikan</h3><p className="muted">Pesanan belum dikirim dan deadline yang sudah lewat</p></div></div>
      <div className="attentionList">{orders.filter(x=>x.status==="belum_dikirim" || isLate(x)).slice(0,8).map(x=><div className="attention" key={x.id}><div><b>{x.name}</b><span>{x.quantity} pcs · {money(x.total)}</span></div><div>{isLate(x)?<span className="badge danger">⚠ Terlambat</span>:<span className="badge warn">Belum dikirim</span>}</div></div>)}
      {!orders.some(x=>x.status==="belum_dikirim"||isLate(x))&&<div className="empty">Tidak ada pesanan yang perlu diperhatikan.</div>}</div>
    </div>
  </section>
}
function Stat({title,value,icon:Icon,tone=""}){return <div className={"stat "+tone}><div className="statIcon"><Icon size={20}/></div><div><span>{title}</span><strong>{value}</strong></div></div>}

function Orders({orders,reload,toast}){
  const [q,setQ]=useState(""),[status,setStatus]=useState(""),[modal,setModal]=useState(null);
  const list=orders.filter(x=>x.name?.toLowerCase().includes(q.toLowerCase()) && (!status||x.status===status));
  async function remove(id){if(!confirm("Hapus pesanan ini?"))return;const {error}=await supabase.from("orders").delete().eq("id",id);if(error)toast(error.message,"error");else{toast("Pesanan dihapus");reload()}}
  return <section><Toolbar search={q} setSearch={setQ} placeholder="Cari nama pelanggan..." onAdd={()=>setModal({})} filter={<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Semua status</option><option value="belum_dikirim">Belum dikirim</option><option value="sudah_dikirim">Sudah dikirim</option><option value="selesai">Selesai</option></select>}/><DataTable columns={["Nama","Qty","Total","Tanggal","Deadline","Status","Aksi"]} rows={list.map(x=>[x.name,x.quantity+" pcs",money(x.total),dateOnly(x.order_date),dateOnly(x.deadline),<span className={"badge "+(isLate(x)?"danger":x.status==="selesai"?"good":"warn")}>{isLate(x)?"⚠ Terlambat":labelStatus(x.status)}</span>,<Actions onEdit={()=>setModal(x)} onDelete={()=>remove(x.id)}/>])}/>{modal!==null&&<OrderForm item={modal} close={()=>setModal(null)} reload={reload} toast={toast}/>}</section>
}
function labelStatus(s){return ({belum_dikirim:"Belum dikirim",sudah_dikirim:"Sudah dikirim",selesai:"Selesai"})[s]||s}
function Toolbar({search,setSearch,placeholder,onAdd,filter}){return <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder}/></div>{filter}<button className="primary" onClick={onAdd}><Plus size={18}/> Tambah</button></div>}
function Actions({onEdit,onDelete}){return <div className="actions"><button className="iconBtn" title="Edit" onClick={onEdit}><Pencil size={17}/></button><button className="iconBtn dangerIcon" title="Hapus" onClick={onDelete}><Trash2 size={17}/></button></div>}
function DataTable({columns,rows}){return <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>):<tr><td colSpan={columns.length} className="empty">Belum ada data.</td></tr>}</tbody></table></div>}

function OrderForm({item,close,reload,toast}){
  const [f,setF]=useState({name:item.name||"",quantity:item.quantity||1,total:item.total||0,order_date:item.order_date||today(),deadline:item.deadline||today(),status:item.status||"belum_dikirim"});
  const [busy,setBusy]=useState(false);
  async function save(e){e.preventDefault();setBusy(true);const payload={name:f.name,quantity:+f.quantity,total:+f.total,order_date:f.order_date,deadline:f.deadline,status:f.status};const r=item.id?await supabase.from("orders").update(payload).eq("id",item.id):await supabase.from("orders").insert(payload);if(r.error)toast(r.error.message,"error");else{toast(item.id?"Pesanan diperbarui":"Pesanan ditambahkan");close();reload()}setBusy(false)}
  return <Modal title={item.id?"Edit Pesanan":"Tambah Pesanan"} close={close}><form onSubmit={save}><Field label="Nama pelanggan"><input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><div className="grid2"><Field label="Quantity"><input type="number" min="1" required value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})}/></Field><Field label="Total (Rp)"><input type="number" min="0" required value={f.total} onChange={e=>setF({...f,total:e.target.value})}/></Field></div><div className="grid2"><Field label="Tanggal"><input type="date" required value={f.order_date} onChange={e=>setF({...f,order_date:e.target.value})}/></Field><Field label="Deadline"><input type="date" required value={f.deadline} onChange={e=>setF({...f,deadline:e.target.value})}/></Field></div><Field label="Status"><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="belum_dikirim">Belum dikirim</option><option value="sudah_dikirim">Sudah dikirim</option><option value="selesai">Selesai</option></select></Field><ModalActions busy={busy}/></form></Modal>
}
function Expenses({expenses,reload,toast}){
  const [q,setQ]=useState(""),[cat,setCat]=useState(""),[modal,setModal]=useState(null);
  const list=expenses.filter(x=>(x.description||"").toLowerCase().includes(q.toLowerCase())&&(!cat||x.category===cat));
  async function remove(id){if(!confirm("Hapus pengeluaran ini?"))return;const {error}=await supabase.from("expenses").delete().eq("id",id);if(error)toast(error.message,"error");else{toast("Pengeluaran dihapus");reload()}}
  return <section><Toolbar search={q} setSearch={setQ} placeholder="Cari keterangan..." onAdd={()=>setModal({})} filter={<select value={cat} onChange={e=>setCat(e.target.value)}><option value="">Semua kategori</option>{["Iklan","Produksi","Operasional","Pengiriman","Lainnya"].map(x=><option key={x}>{x}</option>)}</select>}/><DataTable columns={["Tanggal","Keterangan","Kategori","Nominal","Aksi"]} rows={list.map(x=>[dateOnly(x.date),x.description,<span className="badge neutral">{x.category}</span>,money(x.amount),<Actions onEdit={()=>setModal(x)} onDelete={()=>remove(x.id)}/>])}/>{modal!==null&&<ExpenseForm item={modal} close={()=>setModal(null)} reload={reload} toast={toast}/>}</section>
}
function ExpenseForm({item,close,reload,toast}){
  const [f,setF]=useState({date:item.date||today(),description:item.description||"",category:item.category||"Iklan",amount:item.amount||0}),[busy,setBusy]=useState(false);
  async function save(e){e.preventDefault();setBusy(true);const p={...f,amount:+f.amount};const r=item.id?await supabase.from("expenses").update(p).eq("id",item.id):await supabase.from("expenses").insert(p);if(r.error)toast(r.error.message,"error");else{toast(item.id?"Pengeluaran diperbarui":"Pengeluaran ditambahkan");close();reload()}setBusy(false)}
  return <Modal title={item.id?"Edit Pengeluaran":"Tambah Pengeluaran"} close={close}><form onSubmit={save}><Field label="Tanggal"><input type="date" required value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field><Field label="Keterangan"><input required value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field><Field label="Kategori"><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{["Iklan","Produksi","Operasional","Pengiriman","Lainnya"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Nominal (Rp)"><input type="number" min="0" required value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field><ModalActions busy={busy}/></form></Modal>
}
function Debts({debts,reload,toast}){
  const [q,setQ]=useState(""),[status,setStatus]=useState(""),[modal,setModal]=useState(null);
  const list=debts.filter(x=>(x.name||"").toLowerCase().includes(q.toLowerCase())&&(!status||x.status===status));
  async function remove(id){if(!confirm("Hapus utang ini?"))return;const {error}=await supabase.from("debts").delete().eq("id",id);if(error)toast(error.message,"error");else{toast("Utang dihapus");reload()}}
  async function mark(id){const {error}=await supabase.from("debts").update({status:"sudah_dibayar"}).eq("id",id);if(error)toast(error.message,"error");else{toast("Utang ditandai sudah dibayar");reload()}}
  const unpaid=debts.filter(x=>x.status==="belum_dibayar").reduce((a,x)=>a+Number(x.amount||0),0);
  return <section><div className="miniStat"><span>Total Utang Belum Dibayar</span><b>{money(unpaid)}</b></div><Toolbar search={q} setSearch={setQ} placeholder="Cari nama/pihak..." onAdd={()=>setModal({})} filter={<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Semua status</option><option value="belum_dibayar">Belum dibayar</option><option value="sudah_dibayar">Sudah dibayar</option></select>}/><DataTable columns={["Pihak","Keterangan","Nominal","Tanggal","Jatuh Tempo","Status","Aksi"]} rows={list.map(x=>[x.name,x.description||"-",money(x.amount),dateOnly(x.date),dateOnly(x.due_date),<span className={"badge "+(x.status==="belum_dibayar"?"danger":"good")}>{x.status==="belum_dibayar"?"Belum dibayar":"Sudah dibayar"}</span>,<div className="actions">{x.status==="belum_dibayar"&&<button className="smallBtn" onClick={()=>mark(x.id)}>Bayar</button>}<Actions onEdit={()=>setModal(x)} onDelete={()=>remove(x.id)}/></div>])}/>{modal!==null&&<DebtForm item={modal} close={()=>setModal(null)} reload={reload} toast={toast}/>}</section>
}
function DebtForm({item,close,reload,toast}){
  const [f,setF]=useState({name:item.name||"",description:item.description||"",amount:item.amount||0,date:item.date||today(),due_date:item.due_date||today(),status:item.status||"belum_dibayar"}),[busy,setBusy]=useState(false);
  async function save(e){e.preventDefault();setBusy(true);const p={...f,amount:+f.amount};const r=item.id?await supabase.from("debts").update(p).eq("id",item.id):await supabase.from("debts").insert(p);if(r.error)toast(r.error.message,"error");else{toast(item.id?"Utang diperbarui":"Utang ditambahkan");close();reload()}setBusy(false)}
  return <Modal title={item.id?"Edit Utang":"Tambah Utang"} close={close}><form onSubmit={save}><Field label="Nama / pihak"><input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field label="Keterangan"><input value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field><Field label="Nominal (Rp)"><input type="number" min="0" required value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field><div className="grid2"><Field label="Tanggal"><input type="date" required value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field><Field label="Jatuh tempo"><input type="date" required value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})}/></Field></div><Field label="Status"><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="belum_dibayar">Belum dibayar</option><option value="sudah_dibayar">Sudah dibayar</option></select></Field><ModalActions busy={busy}/></form></Modal>
}
function Balance({balance,sales,expenses,paidDebt,ending,reload,toast}){
  const [amount,setAmount]=useState(balance?.initial_balance||0),[busy,setBusy]=useState(false);
  async function save(e){e.preventDefault();setBusy(true);const p={initial_balance:+amount};const r=balance?await supabase.from("balance").update(p).eq("id",balance.id):await supabase.from("balance").insert(p);if(r.error)toast(r.error.message,"error");else{toast("Saldo awal disimpan");reload()}setBusy(false)}
  return <section><div className="balanceHero"><span>Saldo Akhir</span><strong>{money(ending)}</strong></div><div className="balanceGrid"><div className="panel"><h3>Saldo Awal</h3><form onSubmit={save}><Field label="Masukkan saldo awal"><input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Field><button className="primary" disabled={busy}>Simpan Saldo Awal</button></form></div><div className="panel"><h3>Perhitungan</h3><Rows rows={[["Saldo awal",money(balance?.initial_balance)],["Penjualan",`+ ${money(sales)}`],["Pengeluaran",`− ${money(expenses)}`],["Pembayaran utang",`− ${money(paidDebt)}`],["Saldo akhir",money(ending)]]}/></div></div></section>
}
function Reports({month,year,sales,expenses,profit,adSpend,orders,expensesData}){
  const cats=["Iklan","Produksi","Operasional","Pengiriman","Lainnya"];
  return <section><div className="report" id="printReport"><div className="reportTitle"><div><h2>Laporan Laba Rugi</h2><p>{months[month-1]} {year}</p></div><button className="primary noPrint" onClick={()=>window.print()}><Printer size={17}/> Cetak Laporan</button></div><div className="reportBlock"><h3>Pendapatan</h3><Rows rows={[[`Total Penjualan (${orders.length} pesanan)`,money(sales)]]}/></div><div className="reportBlock"><h3>Pengeluaran</h3><Rows rows={cats.map(c=>[c,money(expensesData.filter(x=>x.category===c).reduce((a,x)=>a+Number(x.amount||0),0))]).concat([["Total Pengeluaran",money(expenses)]])}/></div><div className={"profitBox "+(profit<0?"loss":"")}><span>{profit>=0?"Laba Bersih":"Rugi"}</span><strong>{money(Math.abs(profit))}</strong></div><div className="reportNote">Pengeluaran iklan periode ini: <b>{money(adSpend)}</b></div></div></section>
}
function Rows({rows}){return <div className="rows">{rows.map((r,i)=><div key={i}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Modal({title,close,children}){return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>{title}</h3><button className="iconBtn" onClick={close}><X size={19}/></button></div>{children}</div></div>}
function ModalActions({busy}){return <div className="modalActions"><button type="button" className="secondary" onClick={()=>window.history.go(0)}>Batal</button><button className="primary" disabled={busy}>{busy?<Loader2 className="spin"/>:"Simpan"}</button></div>}

createRoot(document.getElementById("root")).render(<App/>);
