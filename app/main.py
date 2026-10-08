from fastapi import FastAPI
from fastapi.responses import HTMLResponse
app=FastAPI(title='Fleet Health Console')
SERVERS=[{'name':'edge-01','model':'DL360 Gen11','health':'OK'},{'name':'edge-02','model':'DL380 Gen11','health':'Warning'},{'name':'db-01','model':'DL360 Gen11','health':'Critical'},{'name':'api-01','model':'DL380 Gen11','health':'OK'}]
@app.get('/health')
def health(): return {'status':'ok'}
@app.get('/api/servers')
def servers(): return SERVERS
@app.get('/',response_class=HTMLResponse)
def home():
    return HTMLResponse('''<!doctype html><html><head><meta charset='utf-8'><title>Fleet Health</title><style>body{font-family:Arial;margin:40px;max-width:900px}.server{border-bottom:1px solid #ddd;padding:10px}.health{font-weight:700}</style></head><body><h1>Fleet Health Console</h1><div id='summary'></div><div id='servers'></div><script>async function load(){const xs=await (await fetch('/api/servers')).json();summary.textContent=`${xs.length} servers`;servers.innerHTML=xs.map(x=>`<div class='server'><strong>${x.name}</strong> — ${x.model} — <span class='health'>${x.health}</span></div>`).join('');}load();</script></body></html>''')
