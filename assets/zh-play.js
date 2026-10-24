"use strict";
    /* ── QUIZ (趣味角色配對) ── */
    const quizQuestions = [
    {
        "q": "最近最想改善哪一種生活習慣？",
        "options": [
            {
                "text": "工作久坐，想安排放鬆時間",
                "type": "mj"
            },
            {
                "text": "看螢幕的時間太長，想提醒自己休息",
                "type": "yebao"
            },
            {
                "text": "想建立飲食與運動的規律",
                "type": "burner"
            }
        ]
    },
    {
        "q": "如果選一位守護者陪你開始，你會選？",
        "options": [
            {
                "text": "充滿節奏感的 MJ 機器人",
                "type": "mj"
            },
            {
                "text": "重視用眼習慣的葉寶 EX",
                "type": "yebao"
            },
            {
                "text": "鼓勵行動與自信的 Burner 姐",
                "type": "burner"
            }
        ]
    }
];
    const quizResultsData = {
        mj: { title: "MJ 機器人", desc: "你的生活型態守護者是 MJ 機器人！工作與生活之餘，也別忘了安排放鬆的時間。想了解對應的按摩機，可查看正式商品資訊。", img: "https://squallorc-dot.github.io/fun/images/funai-care-mj-robot.png", link: "https://www.funaicare.com/item/care-mj" },
        yebao: { title: "葉寶 EX", desc: "你的生活型態守護者是葉寶 EX！長時間使用螢幕，記得適時休息、留意用眼習慣。想認識相關營養產品，可查看正式商品資訊。", img: "https://squallorc-dot.github.io/fun/images/funai-care-ye-bao-ex.png", link: "https://www.funaicare.com/item/funcare-aawx90" },
        burner: { title: "Burner 姐", desc: "你的生活型態守護者是 Burner 姐！從日常飲食與運動習慣開始，逐步累積自己的節奏。想認識相關產品，可查看正式商品資訊。", img: "https://squallorc-dot.github.io/fun/images/funai-care-burner-sister.png", link: "https://www.funaicare.com/item/burner-sr15x5" }
    };
    let currentQuizQ = 0, quizScores = { mj:0, yebao:0, burner:0 }, quizAnswers = [];

    function startQuiz() {
        document.getElementById('quiz-start').style.display = 'none';
        document.getElementById('quiz-play').style.display = 'block';
        currentQuizQ = 0; quizScores = { mj:0, yebao:0, burner:0 }; quizAnswers = [];
        showQuizQuestion();
    }
    function showQuizQuestion() {
        const q = quizQuestions[currentQuizQ];
        document.getElementById('quiz-question-text').innerText = q.q;
        document.getElementById('quiz-progress-fill').style.width = (currentQuizQ / quizQuestions.length * 100) + '%';
        document.getElementById('quiz-options').innerHTML = q.options.map(o =>
            `<button type="button" class="quiz-option" onclick="answerQuiz('${o.type}')">${o.text}</button>`
        ).join('');
    }
    function answerQuiz(type) {
        quizScores[type]++; quizAnswers.push(type); currentQuizQ++;
        if (currentQuizQ < quizQuestions.length) { showQuizQuestion(); }
        else {
            document.getElementById('quiz-progress-fill').style.width = '100%';
            document.getElementById('quiz-play').style.display = 'none';
            document.getElementById('quiz-loading').style.display = 'block';
            setTimeout(showQuizResult, 1500);
        }
    }
    function showQuizResult() {
        document.getElementById('quiz-loading').style.display = 'none';
        document.getElementById('quiz-result').style.display = 'block';
        const topScore = Math.max(...Object.values(quizScores));
        const tied = Object.keys(quizScores).filter(key => quizScores[key] === topScore);
        const maxType = [...quizAnswers].reverse().find(key => tied.includes(key)) || tied[0];
        let res = quizResultsData[maxType];
        document.getElementById('quiz-res-img').src = res.img;
        document.getElementById('quiz-res-title').innerText = res.title;
        document.getElementById('quiz-res-title').style.cssText = "font-family:'Bebas Neue',sans-serif;font-size:2.5rem;letter-spacing:2px;color:#f0f4ff;margin-bottom:10px;text-shadow:0 0 15px rgba(0,213,255,0.3);";
        document.getElementById('quiz-res-desc').innerHTML = res.desc.replace(/\n/g, '<br>');
        document.getElementById('quiz-res-link').href = res.link;

        // 🌟 埋設：發送測驗完成與推薦結果事件到 GA4 🌟
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'quiz_completed',
            'recommended_hero': res.title 
        });
    }
    function resetQuiz() {
        document.getElementById('quiz-result').style.display = 'none';
        document.getElementById('quiz-start').style.display = 'block';
    }

    /* ── CANVAS GAME ── */
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    // Accessible keyboard input on the game canvas; original pointer controls remain.
    canvas.setAttribute('tabindex','0');
    canvas.setAttribute('aria-label', "Bio-City 守護者遊戲，按方向鍵左右移動；按 Escape 返回選角畫面");
    let animationId, lastTime = 0, protocolTimer = null;
    const G_W = 450, G_H = 700, P_SIZE = 60, E_SIZE = 50, P_Y = G_H - 100;
    const HEROES = {
        burner: { id:'burner', emoji:'👩‍🎤', color:'#f43f5e', weapon:'⚡', fireRate:300, dmg:1, speed:6 },
        mj: { id:'mj', emoji:'🤖', color:'#0ea5e9', weapon:'🎵', fireRate:600, dmg:2, speed:4 },
        yebao: { id:'yebao', emoji:'🦸‍♂️', color:'#f59e0b', weapon:'⚔️', fireRate:1000, dmg:4, speed:8 }
    };
    const ENEMIES = [
        { emoji:'👻', hp:1, speed:2.5, score:10, energy:5 },
        { emoji:'🐉', hp:3, speed:1.5, score:30, energy:10 },
        { emoji:'🧟‍♂️', hp:8, speed:0.8, score:80, energy:20 }
    ];
    let gState = { status:'select', hero:null, x:G_W/2, score:0, hp:5, energy:0, enemies:[], proj:[], particles:[], lastSpawn:0, lastFire:0, protocol:false, gaSent:false };
    const uiH = document.getElementById('game-header');
    const elHpG = document.getElementById('ui-hp');
    const elScoreG = document.getElementById('ui-score');
    const elEnergyG = document.getElementById('ui-energy');

    window.startCanvasGame = function(heroId) {
        gState = { status:'playing', hero:HEROES[heroId], x:G_W/2, score:0, hp:5, energy:0, enemies:[], proj:[], particles:[], lastSpawn:0, lastFire:0, protocol:false, gaSent:false };
        document.getElementById('game-ui-select').style.display = 'none';
        document.getElementById('game-ui-gameover').style.display = 'none';
        uiH.style.display = 'flex'; updateGameDOM();
        if (animationId) cancelAnimationFrame(animationId);
        if (protocolTimer) { clearTimeout(protocolTimer); protocolTimer = null; }
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
        canvas.focus({preventScroll:true});
    };
    window.resetToCanvasMenu = function() {
        gState.status = 'select';
        if (protocolTimer) { clearTimeout(protocolTimer); protocolTimer = null; }
        if (animationId) cancelAnimationFrame(animationId);
        document.getElementById('game-ui-gameover').style.display = 'none';
        document.getElementById('game-ui-select').style.display = 'flex';
        ctx.clearRect(0,0,G_W,G_H);
    };
    function handleGameMove(clientX) {
        if (gState.status !== 'playing' || gState.protocol) return;
        const rect = canvas.getBoundingClientRect();
        let x = (clientX - rect.left) * (G_W / rect.width);
        gState.x = Math.max(P_SIZE/2, Math.min(x, G_W - P_SIZE/2));
    }
    canvas.addEventListener('keydown', e => {
        if (gState.status !== 'playing') return;
        if (e.key === 'Escape') { e.preventDefault(); window.resetToCanvasMenu(); return; }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        gState.x = Math.max(P_SIZE/2, Math.min(G_W-P_SIZE/2, gState.x + dir*32));
    });
    canvas.addEventListener('mousemove', e => handleGameMove(e.clientX));
    canvas.addEventListener('touchmove', e => { e.preventDefault(); handleGameMove(e.touches[0].clientX); }, {passive:false});
    function spawnParticles(x, y, color) {
        for (let i=0; i<8; i++) gState.particles.push({ x, y, vx:(Math.random()-.5)*8, vy:(Math.random()-.5)*8, life:1, color });
    }
    function gameLoop(time) {
        if (gState.status !== 'playing') return;
        const dt = time - lastTime; lastTime = time;
        updateGame(dt, time); drawGame();
        if (gState.status === 'playing') animationId = requestAnimationFrame(gameLoop);
        else if (gState.status === 'gameover') {
            uiH.style.display = 'none';
            document.getElementById('game-ui-gameover').style.display = 'flex';
            document.getElementById('final-score').innerText = gState.score;

            // 🌟 埋設：發送遊戲結束與分數事件到 GA4 🌟
            if (!gState.gaSent) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'game_completed',
                    'hero_used': gState.hero.id, 
                    'final_score': gState.score     
                });
                gState.gaSent = true;
            }
        }
    }
    function updateGame(dt, time) {
        if (gState.protocol) return;
        const ts = Math.min(dt/16.6, 3);
        if (time - gState.lastFire > gState.hero.fireRate) {
            gState.proj.push({ x:gState.x, y:P_Y - P_SIZE/2, dmg:gState.hero.dmg, speed:gState.hero.speed });
            gState.lastFire = time;
        }
        if (time - gState.lastSpawn > Math.max(400, 1500 - gState.score * 2)) {
            const r = Math.random();
            let tmpl = r > .9 ? ENEMIES[2] : (r > .7 ? ENEMIES[1] : ENEMIES[0]);
            gState.enemies.push({ x:Math.random()*(G_W-E_SIZE)+E_SIZE/2, y:-E_SIZE, ...tmpl, hp:tmpl.hp });
            gState.lastSpawn = time;
        }
        for (let i=gState.proj.length-1; i>=0; i--) {
            gState.proj[i].y -= gState.proj[i].speed * ts;
            if (gState.proj[i].y < -30) gState.proj.splice(i,1);
        }
        for (let i=gState.enemies.length-1; i>=0; i--) {
            let e = gState.enemies[i]; e.y += e.speed * ts;
            if (Math.hypot(e.x-gState.x, e.y-P_Y) < (E_SIZE+P_SIZE)/2*.7 || e.y > G_H) {
                gState.hp--; gState.enemies.splice(i,1); updateGameDOM();
                if (gState.hp <= 0) gState.status = 'gameover'; continue;
            }
            for (let j=gState.proj.length-1; j>=0; j--) {
                let p = gState.proj[j];
                if (Math.hypot(e.x-p.x, e.y-p.y) < (E_SIZE+24)/2) {
                    e.hp -= p.dmg; gState.proj.splice(j,1);
                    if (e.hp <= 0) {
                        gState.score += e.score; gState.energy += e.energy;
                        spawnParticles(e.x, e.y, '#00d5ff');
                        gState.enemies.splice(i,1); updateGameDOM();
                        if (gState.energy >= 100) {
                            gState.energy = 0; gState.protocol = true;
                            protocolTimer = setTimeout(() => { if(gState.status !== 'playing') return; gState.enemies.forEach(ex => gState.score += ex.score); gState.enemies = []; gState.protocol = false; updateGameDOM(); protocolTimer=null; }, 1000);
                        }
                        break;
                    }
                }
            }
        }
        for (let i=gState.particles.length-1; i>=0; i--) {
            let pt = gState.particles[i]; pt.x+=pt.vx; pt.y+=pt.vy; pt.life-=.05;
            if (pt.life <= 0) gState.particles.splice(i,1);
        }
    }
    function updateGameDOM() {
        elHpG.innerText = Math.max(0, gState.hp);
        elScoreG.innerText = gState.score;
        elEnergyG.style.width = Math.min(100, gState.energy) + '%';
    }
    function drawGame() {
        ctx.fillStyle = '#020617'; ctx.fillRect(0,0,G_W,G_H);
        ctx.strokeStyle = 'rgba(0,213,255,0.06)'; ctx.lineWidth = 1;
        for (let i=0; i<G_H; i+=40) {
            ctx.beginPath(); ctx.moveTo(0, (i+(Date.now()/20))%G_H); ctx.lineTo(G_W, (i+(Date.now()/20))%G_H); ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '24px Arial'; gState.proj.forEach(p => ctx.fillText(gState.hero.weapon, p.x, p.y));
        ctx.font = '40px Arial';
        gState.enemies.forEach(e => {
            ctx.fillText(e.emoji, e.x, e.y);
            if (e.hp > 1) { ctx.fillStyle = '#ff3b53'; ctx.fillRect(e.x-20, e.y-30, 40*(e.hp/(e.hp+2)), 4); }
        });
        ctx.font = '50px Arial'; ctx.shadowColor = gState.hero.color; ctx.shadowBlur = 20;
        ctx.fillText(gState.hero.emoji, gState.x, P_Y); ctx.shadowBlur = 0;
        gState.particles.forEach(pt => {
            ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (gState.protocol) {
            ctx.fillStyle = 'rgba(0,213,255,0.2)'; ctx.fillRect(0,0,G_W,G_H);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 36px monospace'; ctx.shadowColor = '#00d5ff'; ctx.shadowBlur = 20;
            ctx.fillText('FUNAI PROTOCOL', G_W/2, G_H/2); ctx.shadowBlur = 0;
        }
    }
