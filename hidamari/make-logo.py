"""Outline Lilita One (SIL OFL) into a self-contained game logo.
Font source: https://github.com/google/fonts/tree/main/ofl/lilitaone
Place LilitaOne-Regular.ttf next to this script before running.
"""
from pathlib import Path
from copy import deepcopy
from lxml import etree as X
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ns='http://www.w3.org/2000/svg'
font=TTFont('LilitaOne-Regular.ttf');glyphs=font.getGlyphSet();cmap=font.getBestCmap()
# Keep the game's actual fruit mascots, replacing the lettering.
old=X.parse('/tmp/fruits-logo-before.svg' if Path('/tmp/fruits-logo-before.svg').exists() else 'title-logo.svg').getroot()
root=X.Element('svg',nsmap={None:ns},attrib={'viewBox':'0 0 760 560','role':'img','aria-label':'Fruits Fever'})
defs=X.SubElement(root,'defs')
for name,colors in [('logo-leaf',['#64af6e','#36825c']),('logo-juice',['#ff9564','#f06450'])]:
 g=X.SubElement(defs,'linearGradient',id=name,x1='0',y1='0',x2='0',y2='1')
 for at,color in [('0',colors[0]),('1',colors[1])]:X.SubElement(g,'stop',offset=at,attrib={'stop-color':color})
X.SubElement(root,'ellipse',cx='380',cy='307',rx='307',ry='182',fill='#f3dfad',opacity='.65')
for child in old:
 if child.tag.split('}')[-1]=='g' and 'scale(1.' in child.get('transform',''):root.append(deepcopy(child))
# Thick, soft display letters; a slightly rising baseline makes the wordmark feel lively.
for word,width,baseline,color in [('FRUITS',466,267,'logo-leaf'),('FEVER',523,398,'logo-juice')]:
 advance=sum(font['hmtx'][cmap[ord(c)]][0] for c in word);scale=width/advance;x=(760-width)/2
 group=X.SubElement(root,'g',transform=f'rotate(-4 380 {baseline-50})')
 letter_paths=[];offset=0
 for n,c in enumerate(word):
  pen=SVGPathPen(glyphs,ntos=lambda v: format(v,".2f").rstrip("0").rstrip(".") if v else "0");glyphs[cmap[ord(c)]].draw(TransformPen(pen,(scale,0,0,-scale,x+offset*scale,baseline+[0,-2,1,-1,1,0][n])))
  letter_paths.append(pen.getCommands())
  offset+=font['hmtx'][cmap[ord(c)]][0]
 # Repeated complete silhouettes ensure consistent outer keyline and solid dimensional shadow.
 for fill,stroke,sw,dy in [('#245840','#245840',25,8),('#fff9df','#fff9df',19,0),(f'url(#{color})',f'url(#{color})',0,0)]:
  layer=X.SubElement(group,'g',transform=f'translate(0 {dy})',fill=fill,stroke=stroke,attrib={'stroke-width':str(sw),'stroke-linejoin':'round','paint-order':'stroke'})
  for d in letter_paths:X.SubElement(layer,'path',d=d)
# Tiny fresh leaves, rather than a surround of ornamental stars.
X.SubElement(root,'path',d='M546 126Q566 100 587 112Q577 135 546 126Z',fill='#67a461',transform='rotate(-8 560 120)')
X.SubElement(root,'path',d='M177 364Q159 345 146 355Q153 374 177 364Z',fill='#72aa63')
logo=X.tostring(root,encoding='unicode');Path('title-logo.svg').write_text(logo)
p=Path('index.html');html=p.read_text();import re
html=re.sub(r'(<h1 id="title">).*?(</h1>)',lambda m:m[1]+logo+m[2],html,flags=re.S);p.write_text(html)
