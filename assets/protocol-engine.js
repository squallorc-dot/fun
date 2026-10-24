/* Bio-City Protocol — bilingual decision lab + turn-based command center.
   Content is fictional; neither a validated health questionnaire nor medical advice.
   Vanilla JavaScript, no third-party dependencies. */
(function(){'use strict';
const ROOT='https://squallorc-dot.github.io/fun/images/';
const ROSTER=[
 {id:'burner',image:'funai-care-burner-sister.png',sector:'energy',cost:3,power:18,cool:1},
 {id:'mj',image:'funai-care-mj-robot.png',sector:'activity',cost:3,power:18,cool:1},
 {id:'moo',image:'funai-care-moo-moo.png',sector:'activity',cost:4,power:21,cool:2},
 {id:'yebao',image:'funai-care-ye-bao-ex.png',sector:'vision',cost:3,power:18,cool:1},
 {id:'jelly',image:'funai-care-jelly-trio.png',sector:'vision',cost:4,power:18,cool:2},
 {id:'veggie',image:'funai-care-veggie-kid.png',sector:'supply',cost:3,power:18,cool:1},
 {id:'oracle',image:'funai-care-oracle-guardian.png',sector:'all',cost:5,power:10,cool:3}
];
const SECTORS=['activity','vision','supply','energy'];
const MISSIONS=[{id:'restore',rounds:6,min:45,focus:null},{id:'supply',rounds:7,min:47,focus:'supply'},{id:'siege',rounds:8,min:51,focus:null}];
const MODES=[{id:'normal',pressure:.88,start:88,regen:5},{id:'advanced',pressure:1,start:84,regen:4},{id:'expert',pressure:1.15,start:80,regen:4}];
const QUESTIONS=[
 {topic:['多重期限','重なる締め切り'],q:['上午突然收到三件今天都要完成的工作，但時間只夠做好兩件。你會怎麼決定？','今日が締め切りの仕事が三つ重なりました。十分な時間は二つ分しかありません。どう動きますか？'],options:[
  ['先辨認不可延誤的任務，向相關人員說明取捨','期限を外せない仕事を特定し、優先順位を共有する',[3,2,2,0],'burner'],
  ['拆成最小交付成果，先處理阻塞其他人的部分','作業を小さく分け、他の人を止める部分から進める',[2,3,1,0],'mj'],
  ['先確認三項工作的風險、依賴關係與影響','三つの仕事のリスクと依存関係を確認する',[1,1,3,0],'oracle'],
  ['協調分工或截止時間，同時保留必要的休息','分担や期限を調整し、休息も確保する',[1,3,1,3],'moo'] ]},
 {topic:['螢幕疲勞','画面作業'],q:['連續數小時使用電腦，卻還要完成需要高度專注的文件。你會優先採取哪一種做法？','長時間の画面作業の後、集中力が必要な資料を仕上げます。最初の一手は？'],options:[
  ['先規劃短暫離開螢幕，再分段完成','短く画面から離れ、作業を区切って進める',[2,1,2,3],'yebao'],
  ['切換到紙本或其他工具，減少不必要的螢幕使用','紙などに切り替え、不要な画面利用を減らす',[2,2,3,1],'jelly'],
  ['確認是否真的需要今天完成全部細節','本当に今日すべて仕上げる必要があるか確かめる',[3,1,2,1],'oracle'],
  ['集中處理最重要的段落，稍後再做格式修飾','重要な部分を優先し、体裁は後で整える',[3,2,1,0],'burner'] ]},
 {topic:['有限預算','限られた予算'],q:['這個月的時間與預算都很緊，但你想改善作息。哪個方案較符合你的決策方式？','今月は時間も予算も限られています。生活リズムを見直すなら？'],options:[
  ['先找出能持續執行、幾乎不增加成本的改變','費用をほぼ増やさず続けられる方法から始める',[2,3,2,2],'veggie'],
  ['先建立紀錄，辨認最常失敗的時段','記録を付けて崩れやすい時間帯を見つける',[1,1,3,2],'oracle'],
  ['選一個最迫切的目標，其他維持現況','優先課題を一つに絞り、他は現状維持にする',[3,2,1,1],'burner'],
  ['邀請身邊的人共同調整，減少執行阻力','周囲と一緒に調整し、続けやすくする',[1,3,1,3],'moo'] ]},
 {topic:['資訊判斷','情報の見極め'],q:['社群出現一篇聲稱「一週就能徹底解決生活問題」的熱門貼文，你會如何判斷？','SNSで「一週間ですべて解決」と話題の投稿を見ました。どう判断しますか？'],options:[
  ['查看原始依據與限制條件，不直接採信結論','根拠と条件を確認し、そのまま信じない',[1,1,3,1],'oracle'],
  ['比較不同可靠來源，留意是否偷換概念','複数の信頼できる情報源で確かめる',[1,2,3,0],'yebao'],
  ['先分辨哪些建議成本低、風險可控','試すなら負担とリスクの低い部分を選ぶ',[2,2,2,1],'veggie'],
  ['記下疑點，先不分享，也不急著嘗試','疑問点を記録し、拡散や実行を急がない',[1,1,3,2],'jelly'] ]},
 {topic:['突發插單','予定外の依頼'],q:['原定運動時間突然被臨時任務占用，但你已經連續好幾天沒有活動。你會如何安排？','予定していた運動時間に急な仕事が入りました。活動できない日が続いています。どうしますか？'],options:[
  ['保留一段能執行的活動時間，其他時段再調整','実行できる短い活動時間を確保し直す',[2,2,1,3],'mj'],
  ['重新協商交付時間，不讓突發任務無限擴張','納期を相談し、追加作業に上限を設ける',[3,2,2,2],'burner'],
  ['分析衝突是否反覆發生，修正接下來一週的安排','衝突が繰り返される原因を探し、週の計画を見直す',[1,2,3,2],'oracle'],
  ['與同事協調支援，把原有安排部分保留下來','同僚と分担し、元の予定を一部維持する',[1,3,2,2],'moo'] ]},
 {topic:['飲食情境','食事と予定'],q:['一整天行程密集，午餐選擇有限、晚餐又有聚餐。你會如何避免將決策推到最後一刻？','予定が詰まり、昼食の選択肢が少なく夜には会食もあります。どう計画しますか？'],options:[
  ['先確認時間與可行選項，做出務實安排','時間と選択肢を確認し、無理のない計画を立てる',[2,3,2,1],'veggie'],
  ['保留彈性，不用單次選擇衡量整體表現','一度の選択だけで判断せず、柔軟性を残す',[1,2,2,3],'jelly'],
  ['安排簡單的備案，減少臨時決策壓力','簡単な代替案を用意し、直前の判断負担を減らす',[2,3,2,1],'moo'],
  ['先辨認當天最不能忽略的需求，再決定優先順序','その日の重要な条件を把握し、優先順位を決める',[3,1,2,1],'burner'] ]},
 {topic:['資源衝突','資源の競合'],q:['你只能選一項改善：縮短每日通勤耗時，或增加工作中的活動與休息機會。你會如何決定？','通勤時間の短縮か、仕事中の活動と休息の確保か。一つだけ選ぶなら？'],options:[
  ['估算兩者長期影響，再做整體比較','長期的な影響を見積もって比較する',[2,2,3,1],'oracle'],
  ['優先解決目前最妨礙持續執行的瓶頸','いま継続を妨げる最大の障害を解消する',[3,2,1,1],'mj'],
  ['先用短期試行觀察差異，再確定投入','短期間試してから本格的に決める',[1,2,3,2],'yebao'],
  ['與相關人討論調整方案，減少個人負擔','関係者と調整し、一人だけの負担を減らす',[1,3,2,2],'moo'] ]},
 {topic:['回顧與修正','振り返り'],q:['原本的生活計畫執行兩週後成效不如預期，下一步你會怎麼做？','二週間続けた計画が想定通り進みません。次は何をしますか？'],options:[
  ['回顧執行紀錄，調整最常出現的障礙','実行記録を見直し、頻出する障害を修正する',[2,2,3,2],'oracle'],
  ['降低目標規模，先維持可持續性','目標を小さくし、続けられる形を優先する',[2,2,1,3],'veggie'],
  ['拆解目標與時間配置，重新安排節奏','目標と時間配分を分解して再構成する',[3,2,1,2],'burner'],
  ['和他人討論可行選項，讓回饋更具體','他者と具体策を議論し、フィードバックを得る',[1,3,2,2],'jelly'] ]}
];
const EVENTS=[
 ['activity','久坐壓力累積','座り続ける負荷'],['vision','監測系統負載','監視システムへの負荷'],['supply','補給線延誤','補給網の遅延'],['energy','能源調度失衡','エネルギー配分の乱れ'],
 ['activity','城市通勤阻塞','都市交通の停滞'],['vision','注意力訊號干擾','注意信号への干渉'],['supply','資源分配不均','資源配分の偏り'],['energy','修復排程衝突','復旧予定の衝突'],
 ['activity','區域維護積壓','地区整備の停滞'],['vision','感測器誤報','センサーの誤報'],['supply','關鍵物資短缺','重要物資の不足'],['energy','核心轉換效率下降','中枢変換効率の低下'],
 ['activity','行動通道受阻','移動経路の封鎖'],['vision','藍光巨龍來襲','ブルーライトドラゴン襲来'],['supply','營養黑洞獸擾動','補給ブラックホール獣の襲来'],['energy','熵能波動擴散','エントロピー波の拡大']
];
const WORDS={
 zh:{name:'繁中',regions:['活動區','視覺區','補給區','能源區'],axes:['優先判斷','資源協調','風險辨識','恢復安排'],heroes:['Burner 姐','MJ 機器人','萌牛阿哞','葉寶 EX','果凍三兄妹','野菜小將','守望者 Oracle'],
 heading:'現實情境決策分析',intro:'8 道有取捨的情境問題；沒有單一標準答案。完成後回顧你的決策傾向與對應守護者。',start:'開始決策分析',question:'決策情境',previous:'上一題',progress:'完成進度',analysis:'決策風格報告',strong:'較常運用的判斷面向',consider:'值得留意的面向',primary:'主要對應守護者',secondary:'輔助守護者',report:'這些指標是遊戲內的選擇傾向換算，不代表能力測驗、醫療或心理評估。',restartQuiz:'重新分析',toGame:'前往城市防衛',notes:['你的選擇較重視處理核心優先事項。','你傾向在限制中尋找可執行的資源安排。','你會留意資訊、條件與潛在後果。','你重視能否持續執行與適當調整節奏。'],
 gameHeading:'城市危機指揮中心',gameIntro:'選擇任務與難度。每回合要在有限能源下處理兩起事件；七組守護者擁有不同專長、花費與冷卻回合。',mission:'任務模式',difficulty:'難度',missions:['城市重啟｜6 回合','補給守護｜7 回合','多線防衛｜8 回合'],missionDescriptions:['回合結束時，城市四區平均完整度至少 45。','回合結束時，城市四區平均完整度至少 47，且補給區至少 60。','回合結束時，四區完整度都至少 51。'],difficultyNames:['一般','進階','專家'],startGame:'進入指揮中心',turn:'回合',energy:'可用能源',average:'城市完整度',threats:'本回合事件',sectors:'城市區域｜選擇部署目標',roster:'守護者｜選擇戰術',action:'本回合指令',deploy:'部署守護者',fortify:'整備區域（耗費 2 能源；本回合減少 8 威脅、恢復 3 完整度）',reserve:'保留資源（獲得 4 能源；本回合不部署）',cost:'能源',cooldown:'冷卻',rounds:'回合',confirm:'執行本回合',noHero:'請先選擇可用守護者與城市區域。',notEnough:'能源不足，請改選守護者或保留資源。',cooling:'仍在冷卻中，請選其他守護者。',pressure:'威脅',history:'最近決策紀錄',success:'任務完成',failure:'城市防線失守',finished:'策略結果報告',replay:'重新選擇任務',objective:'勝利條件',help:'遊戲規則',helpText:'每回合出現兩個不同區域的危機。每回合只能執行一次部署、整備或保留資源；守護者的專長區域能發揮最佳效果。Oracle 可同時降低兩起事件的威脅。請守住任務指定的城市完整度。遊戲規則為虛構，並非健康評估。',turnLog:['派遣','整備','保留能源'],winner:'成功守住本次任務要求的區域完整度。',loser:'可以重試不同部署次序與能源配置。',score:'策略分數',last:'本回合結果',bonus:'額外補給',activity:'活動',damage:'損失',repair:'修復',critical:'警戒',stable:'穩定',actionSelect:'請選擇行動',choose:'請選擇',heroTip:'守護者專長區域會提高本回合防護效果；所有技能都是遊戲設定。',strategy:'決策紀錄',resultNote:'策略分數與守護者搭配均為娛樂互動，不反映真實健康狀態。',continue:'下一步',close:'關閉',missionIntro:'不同任務有不同的勝利條件；任何區域降至 0 即任務失敗。',focus:'專長',universal:'全區',city:'CITY GRID',rank:'戰術分析',back:'回到任務選擇',active:'待處理',status:'狀態',scoreDetails:'完成回合與剩餘完整度將影響策略分數。',influenced:'關鍵決策回顧'},
 ja:{name:'日本語',regions:['活動区','視覚区','補給区','エネルギー区'],axes:['優先順位','資源の調整','リスクの把握','回復と持続'],heroes:['バーナー姐さん','MJ ロボット','モーモー阿哞','葉宝 EX','ゼリー三兄妹','野菜ソルジャー','オラクル'],
 heading:'日常の意思決定ラボ',intro:'8つのトレードオフを含む質問。唯一の正解はありません。選択傾向と関連するガーディアンを振り返ります。',start:'意思決定分析を始める',question:'意思決定シナリオ',previous:'前の質問',progress:'進捗',analysis:'意思決定スタイルのレポート',strong:'重視しやすい観点',consider:'見直せる観点',primary:'関連するガーディアン',secondary:'サブガーディアン',report:'数値はゲーム内の選択傾向を換算したもので、能力検査・医療評価・心理検査ではありません。',restartQuiz:'もう一度分析',toGame:'都市防衛に進む',notes:['優先順位を見極める選択が目立ちます。','条件の中で資源を調整する姿勢が見られます。','情報や条件、結果を重視する傾向があります。','持続可能性や適切なペースを大切にしています。'],
 gameHeading:'都市危機コマンドセンター',gameIntro:'ミッションと難易度を選択。各ターン2つの事件に対応します。7組のガーディアンには得意分野、コスト、再使用までのターンがあります。',mission:'ミッション',difficulty:'難易度',missions:['都市再起動｜6ターン','補給防衛｜7ターン','多方面防衛｜8ターン'],missionDescriptions:['終了時に4地区の平均完全度45以上。','終了時に4地区の平均完全度47以上、補給区60以上。','終了時に4地区すべて完全度51以上。'],difficultyNames:['ノーマル','アドバンス','エキスパート'],startGame:'司令センターに入る',turn:'ターン',energy:'使用可能エネルギー',average:'都市完全度',threats:'今ターンの事件',sectors:'都市地区｜配置先',roster:'ガーディアン｜戦術選択',action:'今ターンの指令',deploy:'ガーディアンを配備',fortify:'地区を整備（エネルギー2消費、脅威を8軽減、完全度を3回復）',reserve:'エネルギーを温存（4補給、配備しない）',cost:'エネルギー',cooldown:'再使用',rounds:'ターン',confirm:'このターンを確定',noHero:'ガーディアンと地区を選択してください。',notEnough:'エネルギー不足です。別の行動を選んでください。',cooling:'再使用まで待つ必要があります。',pressure:'脅威',history:'最近の意思決定',success:'ミッション達成',failure:'都市防衛失敗',finished:'戦術結果レポート',replay:'ミッションをやり直す',objective:'達成条件',help:'ゲームルール',helpText:'毎ターン異なる2地区で事件が発生します。1ターンに配備、整備、温存のいずれか一つだけ実行できます。得意地区への配備が最も有効で、オラクルは2事件を同時に軽減します。目標の完全度を維持してください。架空のゲームであり健康評価ではありません。',turnLog:['配備','整備','温存'],winner:'指定された都市完全度の条件を達成しました。',loser:'配置順やエネルギー配分を見直して再挑戦できます。',score:'戦術スコア',last:'今回の結果',bonus:'エネルギー補給',activity:'活動',damage:'損失',repair:'回復',critical:'警戒',stable:'安定',actionSelect:'行動を選択',choose:'選択',heroTip:'ガーディアンは得意地区で最も効果を発揮します。すべて架空の設定です。',strategy:'行動履歴',resultNote:'結果とガーディアンの組み合わせは娯楽を目的としており、実際の健康状態を示しません。',continue:'次へ',close:'閉じる',missionIntro:'ミッションごとに条件が異なります。地区の完全度が0になると即時失敗です。',focus:'得意',universal:'全地区',city:'CITY GRID',rank:'戦術分析',back:'ミッション選択へ',active:'対応が必要',status:'状態',scoreDetails:'達成ターン数と残った完全度が戦術スコアに影響します。',influenced:'重要な判断の振り返り'}
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(hero)=>ROOT+hero.image;
let lang='zh',t=WORDS.zh,quiz={index:0,answers:[],done:false},game=null;
const $=s=>document.querySelector(s);
const rootQuiz=()=>$('#protocol-quiz-root'),rootGame=()=>$('#protocol-game-root');
const titleHero=id=>t.heroes[ROSTER.findIndex(h=>h.id===id)];
const sectorName=id=>t.regions[SECTORS.indexOf(id)];
function reportEvent(event,extra){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...extra});}
function init(selected){lang=selected==='ja'?'ja':'zh';t=WORDS[lang];renderQuiz();renderGame();}
function renderQuiz(){const root=rootQuiz();if(!root)return;
 if(!quiz.started&&!quiz.done&&quiz.index===0&&!quiz.answers.length){root.innerHTML=`<div class="protocol-intro"><p>${esc(t.intro)}</p><div class="protocol-chip-row"><span>08 ${esc(t.question)}</span><span>04 ${lang==='zh'?'分析面向':'分析軸'}</span><span>07 ${lang==='zh'?'守護者':'ガーディアンズ'}</span></div><button class="protocol-primary" data-qaction="start">${esc(t.start)} <span aria-hidden="true">↗</span></button></div>`;return;}
 if(quiz.done){renderQuizResult(root);return;}
 const q=QUESTIONS[quiz.index];const n=quiz.index+1;
 root.innerHTML=`<div class="protocol-quiz-top"><span>${esc(t.question)} ${String(n).padStart(2,'0')} / 08</span><span>${esc(q.topic[lang==='zh'?0:1])}</span></div><div class="protocol-meter" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${n-1}" aria-label="${esc(t.progress)}"><span style="width:${(n-1)/8*100}%"></span></div><h3 class="protocol-question">${esc(q.q[lang==='zh'?0:1])}</h3><div class="protocol-options">${q.options.map((o,i)=>`<button type="button" class="protocol-option" data-answer="${i}"><span class="protocol-letter">${'ABCD'[i]}</span><span>${esc(o[lang==='zh'?0:1])}</span><span aria-hidden="true">↗</span></button>`).join('')}</div><div class="protocol-controls"><button class="protocol-secondary" data-qaction="back" ${quiz.index===0?'disabled':''}>← ${esc(t.previous)}</button><span>${n} / 8</span></div>`;
}
function answerQuiz(i){const q=QUESTIONS[quiz.index];if(!q||!q.options[i])return;quiz.answers[quiz.index]=i;quiz.index++;if(quiz.index===QUESTIONS.length){quiz.done=true;reportEvent('quiz_completed',{recommended_hero:quizSummary().primaryName,protocol_version:'2',quiz_questions:8});}renderQuiz();}
function quizSummary(){let totals=[0,0,0,0],heroScores={};ROSTER.forEach(h=>heroScores[h.id]=0);quiz.answers.forEach((a,i)=>{const o=QUESTIONS[i].options[a];o[2].forEach((x,k)=>totals[k]+=x);heroScores[o[3]]+=3;});const ranked=[...ROSTER].sort((a,b)=>heroScores[b.id]-heroScores[a.id]);const sortedAxes=[0,1,2,3].sort((a,b)=>totals[b]-totals[a]);return {totals,heroScores,primary:ranked[0],secondary:ranked[1],primaryName:titleHero(ranked[0].id),sortedAxes};}
function renderQuizResult(root){const r=quizSummary(),pct=n=>clamp(Math.round(35+n/24*65),35,100);
 root.innerHTML=`<div class="protocol-report-head"><span class="protocol-overline">BIO-CITY / DECISION REPORT</span><h3>${esc(t.analysis)}</h3></div><div class="protocol-result-heroes"><div class="protocol-lead-hero"><img src="${img(r.primary)}" alt="" loading="lazy"><div><small>${esc(t.primary)}</small><strong>${esc(titleHero(r.primary.id))}</strong><span>${esc(t.notes[r.sortedAxes[0]])}</span></div></div><div class="protocol-aide-hero"><img src="${img(r.secondary)}" alt="" loading="lazy"><span>${esc(t.secondary)}<strong>${esc(titleHero(r.secondary.id))}</strong></span></div></div><div class="protocol-axis-grid">${r.totals.map((v,i)=>`<div class="protocol-axis"><div><span>${esc(t.axes[i])}</span><b>${pct(v)}</b></div><div class="protocol-meter"><span style="width:${pct(v)}%"></span></div></div>`).join('')}</div><p class="protocol-insight"><b>${esc(t.strong)}：</b>${esc(t.notes[r.sortedAxes[0]])} <b>${esc(t.consider)}：</b>${esc(t.axes[r.sortedAxes[3]])}。</p><p class="protocol-disclaimer">${esc(t.report)}</p><div class="protocol-control-row"><button class="protocol-secondary" data-qaction="reset">↺ ${esc(t.restartQuiz)}</button><a class="protocol-primary" href="#protocol-game">${esc(t.toGame)} →</a></div>`;
}
function resetQuiz(){quiz={index:0,answers:[],done:false};renderQuiz();}
function chooseEvents(round){const candidates=EVENTS.map((e,i)=>({index:i,sector:e[0],title:e[lang==='zh'?1:2]}));const first=candidates[(round*7+Math.floor(Math.random()*candidates.length))%candidates.length];const secondPool=candidates.filter(x=>x.sector!==first.sector);const second=secondPool[(round*5+Math.floor(Math.random()*secondPool.length))%secondPool.length];const multiplier=game.difficulty.pressure;return [first,second].map((e,i)=>({...e,pressure:Math.round((10+round*1.6+(i*2)+Math.floor(Math.random()*5))*multiplier)}));}
const avg=()=>Math.round(SECTORS.reduce((sum,key)=>sum+game.health[key],0)/4);
function newGame(){const mission=MISSIONS[Number($('#protocol-mission')?.value)||0],difficulty=MODES[Number($('#protocol-difficulty')?.value)||0];game={mission,difficulty,round:1,energy:12,health:Object.fromEntries(SECTORS.map(s=>[s,difficulty.start])),cooldowns:{},selectedSector:'activity',selectedHero:'burner',action:'deploy',events:[],history:[],phase:'playing',spent:0,blocked:0,lastDeployed:null};game.events=chooseEvents(game.round);reportEvent('protocol_game_started',{mission:mission.id,difficulty:difficulty.id});renderGame();}
function renderGame(){const root=rootGame();if(!root)return;if(!game){root.innerHTML=`<p class="protocol-subcopy">${esc(t.gameIntro)}</p><div class="protocol-game-setup"><label for="protocol-mission">${esc(t.mission)}<select id="protocol-mission">${MISSIONS.map((m,i)=>`<option value="${i}">${esc(t.missions[i])}</option>`).join('')}</select></label><label for="protocol-difficulty">${esc(t.difficulty)}<select id="protocol-difficulty">${MODES.map((m,i)=>`<option value="${i}" ${i===0?'selected':''}>${esc(t.difficultyNames[i])}</option>`).join('')}</select></label><p id="protocol-mission-description">${esc(t.missionDescriptions[0])}</p><button class="protocol-primary" data-gaction="start">${esc(t.startGame)} ↗</button></div><details class="protocol-rules"><summary>${esc(t.help)}</summary><p>${esc(t.helpText)}</p></details>`;return;}
 if(game.phase!=='playing'){renderGameFinish(root);return;}
 const g=game,full=avg();const actionOptions=[['deploy',t.deploy],['fortify',t.fortify],['reserve',t.reserve]];
 root.innerHTML=`<div class="protocol-status"><div><span>${esc(t.turn)}</span><strong>${String(g.round).padStart(2,'0')}<small> / ${g.mission.rounds}</small></strong></div><div><span>${esc(t.energy)}</span><strong>${g.energy}<small> / 20</small></strong></div><div><span>${esc(t.average)}</span><strong>${full}<small> / 100</small></strong></div></div><p class="protocol-objective">${esc(t.objective)}：${esc(t.missionDescriptions[MISSIONS.indexOf(g.mission)])}</p><div class="protocol-game-layout"><div class="protocol-map-column"><div class="protocol-panel-heading"><b>${esc(t.city)}</b><small>${esc(t.sectors)}</small></div><div class="protocol-city-map">${SECTORS.map((s,i)=>`<button type="button" class="protocol-district ${g.selectedSector===s?'selected':''} ${g.health[s]<60?'warning':''}" data-sector="${s}" aria-pressed="${g.selectedSector===s}"><span class="protocol-district-index">0${i+1}</span><strong>${esc(t.regions[i])}</strong><span class="protocol-district-health">${Math.max(0,g.health[s])}<small>/100</small></span><span class="protocol-district-bar"><i style="width:${Math.max(0,g.health[s])}%"></i></span></button>`).join('')}</div><div class="protocol-event-list"><h3>${esc(t.threats)}</h3>${g.events.map(e=>`<div class="protocol-event ${e.sector===g.selectedSector?'is-selected':''}"><span class="protocol-pulse"></span><div><small>${esc(sectorName(e.sector))}</small><strong>${esc(e.title)}</strong></div><b>-${e.pressure}</b></div>`).join('')}</div></div><div class="protocol-tactics"><div class="protocol-panel-heading"><b>${esc(t.action)}</b><small>${esc(t.actionSelect)}</small></div><div class="protocol-action-types">${actionOptions.map(([key,label])=>`<button type="button" class="${g.action===key?'current':''}" data-action="${key}" aria-pressed="${g.action===key}">${esc(label)}</button>`).join('')}</div><div class="protocol-roster ${g.action!=='deploy'?'protocol-muted':''}"><h3>${esc(t.roster)}</h3><div class="protocol-hero-grid">${ROSTER.map((h,i)=>{const wait=g.cooldowns[h.id]||0,disabled=wait>0||g.energy<h.cost;return `<button type="button" class="protocol-hero ${g.selectedHero===h.id?'selected':''}" data-hero="${h.id}" aria-pressed="${g.selectedHero===h.id}" ${g.action!=='deploy'||disabled?'disabled':''}><img src="${img(h)}" alt="" loading="lazy" decoding="async"><span><b>${esc(t.heroes[i])}</b><small>${esc(t.focus)} ${esc(h.sector==='all'?t.universal:sectorName(h.sector))} · ${esc(t.cost)} ${h.cost}</small>${wait?`<small>${esc(t.cooldown)} ${wait} ${esc(t.rounds)}</small>`:''}</span></button>`;}).join('')}</div><p class="protocol-tiny">${esc(t.heroTip)}</p></div><div id="protocol-game-error" role="alert" aria-live="polite"></div><button class="protocol-primary protocol-commit" data-gaction="commit">${esc(t.confirm)} →</button><button class="protocol-text-button" data-gaction="reset">← ${esc(t.back)}</button></div></div>${g.history.length?`<div class="protocol-history"><h3>${esc(t.history)}</h3><ol>${g.history.slice(-3).reverse().map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>`:''}`;
}
function commitTurn(){const g=game;if(!g||g.phase!=='playing')return;
 const err=$('#protocol-game-error');if(g.action==='deploy'){const hero=ROSTER.find(h=>h.id===g.selectedHero);if(!hero){err.textContent=t.noHero;return;}if(g.energy<hero.cost){err.textContent=t.notEnough;return;}if((g.cooldowns[hero.id]||0)>0){err.textContent=t.cooling;return;}}
 let protections={};SECTORS.forEach(s=>protections[s]=0);let choiceDesc='';
 if(g.action==='deploy'){
  const hero=ROSTER.find(h=>h.id===g.selectedHero);g.energy-=hero.cost;g.spent+=hero.cost;g.lastDeployed=hero.id;
  if(hero.sector==='all'){g.events.forEach(e=>protections[e.sector]+=hero.power);g.health[g.selectedSector]=clamp(g.health[g.selectedSector]+3,0,100);}else{
   const focus=hero.sector===g.selectedSector;protections[g.selectedSector]+=focus?hero.power:Math.ceil(hero.power*.6);
   if(hero.id==='moo')g.health[g.selectedSector]=clamp(g.health[g.selectedSector]+7,0,100);
   if(hero.id==='veggie'&&focus)g.energy=clamp(g.energy+2,0,20);
   if(hero.id==='jelly'&&focus)protections[g.selectedSector]+=4;
  }
  g.cooldowns[hero.id]=hero.cool+1;
  choiceDesc=`${t.turn} ${g.round} · ${t.turnLog[0]} ${titleHero(hero.id)} → ${sectorName(g.selectedSector)}`;
 }else if(g.action==='fortify'){
  if(g.energy<2){err.textContent=t.notEnough;return;}g.energy-=2;g.spent+=2;protections[g.selectedSector]=8;g.health[g.selectedSector]=clamp(g.health[g.selectedSector]+3,0,100);choiceDesc=`${t.turn} ${g.round} · ${t.turnLog[1]} ${sectorName(g.selectedSector)}`;
 }else{g.energy=clamp(g.energy+4,0,20);choiceDesc=`${t.turn} ${g.round} · ${t.turnLog[2]}`;}
 let hurt=[];g.events.forEach(e=>{const block=Math.min(e.pressure,protections[e.sector]);const damage=Math.max(0,e.pressure-block);g.blocked+=block;g.health[e.sector]=clamp(g.health[e.sector]-damage,0,100);hurt.push(`${sectorName(e.sector)} -${damage}`);});
 g.history.push(`${choiceDesc} / ${hurt.join(' · ')}`);
 for(const id of Object.keys(g.cooldowns))g.cooldowns[id]=Math.max(0,g.cooldowns[id]-1);
 if(SECTORS.some(s=>g.health[s]<=0)){g.phase='failure';finishGame();return;}
 if(g.round>=g.mission.rounds){const passed=avg()>=g.mission.min && (g.mission.id==='supply'?g.health.supply>=60:true) && (g.mission.id==='siege'?SECTORS.every(s=>g.health[s]>=g.mission.min):true);g.phase=passed?'success':'failure';finishGame();return;}
 g.round++;g.energy=clamp(g.energy+g.difficulty.regen,0,20);g.events=chooseEvents(g.round);renderGame();
}
function finishGame(){const g=game;if(!g)return;const score=Math.max(0,Math.round(avg()*8+g.blocked*2-g.spent*2));reportEvent('game_completed',{hero_used:g.lastDeployed||'none',final_score:score,mission:g.mission.id,difficulty:g.difficulty.id,outcome:g.phase,rounds_played:g.round,protocol_version:'2'});renderGame();}
function renderGameFinish(root){const g=game,passed=g.phase==='success',score=Math.max(0,Math.round(avg()*8+g.blocked*2-g.spent*2));root.innerHTML=`<div class="protocol-finale ${passed?'win':'lose'}"><span class="protocol-overline">BIO-CITY / AFTER ACTION REPORT</span><h3>${esc(passed?t.success:t.failure)}</h3><p>${esc(passed?t.winner:t.loser)}</p><div class="protocol-finale-grid"><div><small>${esc(t.score)}</small><strong>${score}</strong></div><div><small>${esc(t.average)}</small><strong>${avg()}<small>/100</small></strong></div><div><small>${esc(t.turn)}</small><strong>${g.round}<small>/${g.mission.rounds}</small></strong></div></div><h4>${esc(t.influenced)}</h4><ol>${g.history.slice(-5).map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="protocol-disclaimer">${esc(t.resultNote)}</p><button class="protocol-primary" data-gaction="reset">↺ ${esc(t.replay)}</button></div>`;}
function onClick(e){const target=e.target.closest('button,a');if(!target)return;
 if(target.hasAttribute('data-answer')){answerQuiz(Number(target.dataset.answer));return;}
 const qa=target.dataset.qaction;if(qa==='start'){quiz={index:0,answers:[],done:false,started:true};renderQuiz();return;}
 if(qa==='back'&&quiz.index>0){quiz.index--;quiz.answers.length=quiz.index;renderQuiz();return;}
 if(qa==='reset'){resetQuiz();return;}
 const ga=target.dataset.gaction;if(ga==='start'){newGame();return;}if(ga==='commit'){commitTurn();return;}if(ga==='reset'){game=null;renderGame();return;}
 if(!game||game.phase!=='playing')return;
 if(target.dataset.sector){game.selectedSector=target.dataset.sector;renderGame();return;}
 if(target.dataset.hero){game.selectedHero=target.dataset.hero;renderGame();return;}
 if(target.dataset.action){game.action=target.dataset.action;renderGame();return;}
}
function onChange(e){if(e.target?.id==='protocol-mission'&& !game){const i=Number(e.target.value);const el=$('#protocol-mission-description');if(el)el.textContent=t.missionDescriptions[i];}}
document.addEventListener('click',e=>{if(e.target.closest('#protocol-quiz-root,#protocol-game-root'))onClick(e);});document.addEventListener('change',onChange);
window.BioCityProtocol={init};
})();
