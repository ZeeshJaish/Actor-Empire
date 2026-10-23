import React from 'react';
import {createRoot} from 'react-dom/client';
import {DevelopmentLabScriptWizard} from '../../../views/lifestyle/business/components/DevelopmentLabScriptWizard';
import '/index.css';
const saved=JSON.parse(localStorage.getItem('ae-script-broad-qa-only') || 'null');
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:448,margin:'auto',padding:16}}><DevelopmentLabScriptWizard language={'en' as any} initialScript={new URLSearchParams(location.search).has('rewrite') ? saved : undefined} onComplete={script=>{localStorage.setItem('ae-script-broad-qa-only',JSON.stringify(script));document.getElementById('result')!.textContent=JSON.stringify(script)}}/><pre id="result" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{saved?JSON.stringify(saved):''}</pre></main>);
