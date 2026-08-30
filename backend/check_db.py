import sqlite3
import json

db_path = 'test.db'
try:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cur.fetchall()]
    
    counts = {}
    for t in tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM {t}')
            counts[t] = cur.fetchone()[0]
        except Exception as e:
            counts[t] = str(e)
            
    res = {'tables': tables, 'counts': counts}
    
    if 'users' in tables:
        cur.execute(f'SELECT email, role FROM users LIMIT 5')
        res['sample_users'] = cur.fetchall()
        
    print(json.dumps(res, indent=2))
except Exception as e:
    print('DB Error:', e)
