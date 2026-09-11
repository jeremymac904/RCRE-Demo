"""Local-only Academy acceptance checks. No external network or persistent cookies."""
import urllib.request, urllib.error, http.cookiejar, json, re
from pathlib import Path
base='http://localhost:3200'
def session(user):
 op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 op.open(urllib.request.Request(base+'/api/session',data=('userId='+user).encode(),method='POST')).read()
 return op
def request(op,route,body=None,headers=None):
 r=op.open(urllib.request.Request(base+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(headers or {})}));return r.status,r.read(),r.headers
agent=session('u-sarah');trainer=session('u-trainer')
source=Path(__file__).resolve().parents[1]/'src/data/academy.ts'
text=source.read_text();video=re.search(r"src: '(/academy/video/[^']+)'",text).group(1).replace('/academy/','/api/academy/media/')
status,body,h=request(agent,video,headers={'Range':'bytes=0-1023'});assert status==206 and len(body)==1024
for url,expected in [(video,401),(video.replace('/api/academy/media/','/academy/'),404)]:
 try:urllib.request.urlopen(base+url);raise AssertionError('Anonymous file leaked')
 except urllib.error.HTTPError as e:assert e.code==expected
status,body,_=request(agent,'/api/academy/progress');before=json.loads(body)
lesson='c01-l01'
status,body,_=request(agent,'/api/academy/progress',{'lessonId':lesson,'complete':True,'bookmark':True,'seconds':25});assert lesson in json.loads(body)['completedLessonIds']
again=session('u-sarah');assert lesson in json.loads(request(again,'/api/academy/progress')[1])['completedLessonIds']
request(agent,'/api/academy/progress',{'lessonId':lesson,'complete':lesson in before['completedLessonIds'],'bookmark':lesson in before.get('bookmarks',[]),'seconds':before.get('positions',{}).get(lesson,0)})
try:request(agent,'/api/academy/manage',{'action':'policy','courseId':'c01','roles':['trainer']});raise AssertionError('Learner policy edit accepted')
except urllib.error.HTTPError as e:assert e.code==403
request(trainer,'/api/academy/manage',{'action':'policy','courseId':'c01','roles':['trainer']})
try:
 try:request(agent,video,headers={'Range':'bytes=0-1023'});raise AssertionError('Restricted course media leaked')
 except urllib.error.HTTPError as e:assert e.code==403
finally:request(trainer,'/api/academy/manage',{'action':'policy','courseId':'c01','roles':[]})
for route in ['/training/classroom','/training/community','/training/manage']:
 assert request(agent,route)[0]==200
print('PASS: authenticated 206 range, anonymous 401, former public 404, durable completion across sessions, restoration, learner policy denial, restrictive enrollment direct-media 403, training routes.')
