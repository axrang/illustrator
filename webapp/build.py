import pathlib
d=pathlib.Path(__file__).parent
js=''.join((d/f).read_text(encoding='utf8')+'\n' for f in ['1-core.js','2-render.js','3-tools.js','4-ui.js','5-export.js'])
html=(d/'template.html').read_text(encoding='utf8').replace('/*CSS*/',(d/'style.css').read_text(encoding='utf8')).replace('/*JS*/',js.replace('</script>','<\\/script>'))
out=d.parent/'app/src/main/assets/index.html'; out.write_text(html,encoding='utf8'); print(out,len(html))
