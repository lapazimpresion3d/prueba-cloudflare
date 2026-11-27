import json, sqlite3, tempfile, unittest, threading
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
S="a"*64
T="b"*64
A="1"*36
B="2"*36
C="3"*36
def migrate(db, start=1, end=14):
    for f in sorted((ROOT/"migrations-demo").glob("*.sql")):
        if start<=int(f.name[:4])<=end:
            db.executescript(f.read_text(encoding="utf-8"))
def seed(db):
    for s in (S,T):
        db.execute("INSERT INTO demo_sesiones VALUES(?,?)",(s,9999999999))
        for c,mesa in ((A,"1"),(B,"2"),(C,"3")):
            db.execute("INSERT INTO demo_cuentas VALUES(?,?,?,?,?,NULL)",(s,c,mesa,2,1))
            db.execute("INSERT INTO demo_pedidos VALUES(?,?,?,?,?,?,?)",(s,"taqueria-el-comal",c,"f"*64,"entregado",1,json.dumps({"cuenta":c,"total":1000,"estado":"entregado"})))
        for t in ("t1","t2"):
            db.execute("INSERT INTO demo_terminales VALUES(?,?,?,?,1)",(s,t,t,"point_simulado"))
    db.commit()
def request(db,s=S,c=A,t="t1",op="o1",rev=0):
    db.execute("INSERT INTO demo_terminal_operaciones(sesion_id,operacion_id,terminal_id,cuenta_id,importe_centavos,revision_cuenta,creado,solicitud_json) VALUES(?,?,?,?,?,?,1,?)",(s,op,t,c,1000,rev,json.dumps({"id":op,"revision":rev,"metodo":"tarjeta_externa","consumoCentavos":1000,"referencia":"DEMO-123456"})))
def resolve(db,state="aprobado",s=S,op="o1"):
    db.execute("UPDATE demo_terminal_operaciones SET estado=?,resuelto=2 WHERE sesion_id=? AND operacion_id=?",(state,s,op))
def book(db,s=S,c=A,rev=1,op=None,ref="",annul=False):
    m={"id":op or "manual","consumoCentavos":1000,"referencia":ref}
    if op: m["terminal"]={"id":op,"importeCentavos":1000}
    p={"consumoCentavos":1000,"revision":rev,"movimientos":[m],"anulaciones":[{"movimiento":m["id"]}] if annul else []}
    db.execute("INSERT INTO demo_planes_cobro VALUES(?,?,?,?) ON CONFLICT(sesion_id,cuenta_id) DO UPDATE SET revision=excluded.revision,datos_json=excluded.datos_json",(s,c,rev,json.dumps(p)))
def blocked(db,s=S,c=A):
    return db.execute("SELECT count(*) FROM demo_terminal_bloqueos WHERE sesion_id=? AND cuenta_id=?",(s,c)).fetchone()[0]
def close(db,s=S,c=A):
    db.execute("UPDATE demo_cuentas SET cerrado=3 WHERE sesion_id=? AND cuenta_id=?",(s,c))
class Acceptance(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.path=Path(self.tmp.name)/"test.sqlite"
        self.db=sqlite3.connect(self.path);self.db.execute("PRAGMA foreign_keys=ON");migrate(self.db,1,12);seed(self.db)
        # Historical approval predating the full request requirement.
        self.db.execute("INSERT INTO demo_terminal_operaciones(sesion_id,operacion_id,terminal_id,cuenta_id,importe_centavos,revision_cuenta,creado) VALUES(?,?,?,?,1000,0,1)",(S,"old","t2",C))
        resolve(self.db,s=S,op="old");self.db.commit();migrate(self.db,13,14)
    def tearDown(self):
        self.db.close();self.tmp.cleanup()
    def reject(self,fn):
        with self.assertRaises(sqlite3.IntegrityError):fn()
    def test_pending_blocks(self):
        request(self.db);self.assertEqual(blocked(self.db),1)
        self.reject(lambda:request(self.db,c=B,op="o2"))
        self.db.execute("INSERT INTO demo_terminal_resoluciones VALUES(?,?,2,?)",(S,"old","Solicitud histórica sin datos"))
        self.reject(lambda:request(self.db,t="t2",op="o2"))
        self.reject(lambda:book(self.db))
        self.reject(lambda:close(self.db))
        self.reject(lambda:self.db.execute("UPDATE demo_pedidos SET estado='cancelado' WHERE sesion_id=? AND solicitud_id=?",(S,A)))
    def test_release_cancel_reject(self):
        request(self.db);resolve(self.db,"cancelado");self.assertEqual(blocked(self.db),0)
        request(self.db,op="o2");resolve(self.db,"rechazado",op="o2");self.assertEqual(blocked(self.db),0)
    def test_approval_and_annulment(self):
        request(self.db);resolve(self.db);self.assertEqual(blocked(self.db),1)
        self.reject(lambda:book(self.db));book(self.db,op="o1");self.assertEqual(blocked(self.db),0)
        self.reject(lambda:book(self.db,op="o1",rev=1))
        book(self.db,op="o1",rev=2,annul=True);self.assertEqual(blocked(self.db),0)
        self.reject(lambda:close(self.db))
    def test_close_paid(self):
        request(self.db);resolve(self.db);book(self.db,op="o1");close(self.db)
        self.assertEqual(self.db.execute("SELECT cerrado FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=?",(S,A)).fetchone()[0],3)
    def test_folio_and_isolation(self):
        book(self.db,ref="DEMO-123456")
        self.reject(lambda:book(self.db,c=B,ref="DEMO-123456"))
        book(self.db,s=T,ref="DEMO-123456")
    def test_resolution(self):
        self.assertEqual(blocked(self.db,c=C),1)
        self.db.execute("INSERT INTO demo_terminal_resoluciones VALUES(?,?,2,?)",(S,"old","Solicitud histórica sin datos"))
        self.assertEqual(blocked(self.db,c=C),0)
        self.reject(lambda:book(self.db,c=C,op="old"))
        self.assertEqual(self.db.execute("SELECT estado FROM demo_terminal_operaciones WHERE sesion_id=? AND operacion_id='old'",(S,)).fetchone()[0],"aprobado")
        request(self.db);resolve(self.db)
        self.reject(lambda:self.db.execute("INSERT INTO demo_terminal_resoluciones VALUES(?,?,2,?)",(S,"o1","Solicitud histórica sin datos")))
    def test_concurrent(self):
        barrier=threading.Barrier(2);out=[];lock=threading.Lock()
        def worker(op,c):
            with sqlite3.connect(self.path,timeout=10) as db:
                db.execute("PRAGMA foreign_keys=ON");barrier.wait()
                try:request(db,c=c,op=op);db.commit();result="ok"
                except sqlite3.IntegrityError:result="blocked"
                with lock:out.append(result)
        threads=[threading.Thread(target=worker,args=("x",A)),threading.Thread(target=worker,args=("y",B))]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertCountEqual(out,["ok","blocked"])
    def test_clean_install(self):
        with sqlite3.connect(":memory:") as db:
            db.execute("PRAGMA foreign_keys=ON");migrate(db);seed(db);request(db);resolve(db);book(db,op="o1");close(db)
            self.assertEqual(db.execute("PRAGMA foreign_key_check").fetchall(),[])
    def test_foreign_keys(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(),[])
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0],"ok")
if __name__=="__main__":unittest.main(verbosity=2)
