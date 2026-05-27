// 海浪纵波背景系统 - 高级版
(function() {
    'use strict';
    
    // 波浪线配置 - 6条不同的波浪
    const waves = [
        { y: 0.10, amplitude: 35, frequency: 0.008, speed: 0.015, color: '#fffa00', opacity: 0.85, width: 3.2 },
        { y: 0.24, amplitude: 28, frequency: 0.012, speed: 0.032, color: '#fff700', opacity: 0.6, width: 2.2 },
        { y: 0.40, amplitude: 42, frequency: 0.006, speed: 0.023, color: '#666666', opacity: 0.35, width: 1.8 },
        { y: 0.56, amplitude: 32, frequency: 0.010, speed: 0.018, color: '#fffa00', opacity: 0.55, width: 2.8 },
        { y: 0.72, amplitude: 38, frequency: 0.007, speed: 0.043, color: '#888888', opacity: 0.3, width: 1.5 },
        { y: 0.86, amplitude: 25, frequency: 0.014, speed: 0.024, color: '#fff700', opacity: 0.65, width: 2.5 }
    ];
    
    let canvas, ctx;
    let width, height;
    // 从 sessionStorage 恢复时间状态，实现页面跳转后背景连续
    let time = parseFloat(sessionStorage.getItem('waveTime')) || 0;
    let mouseX = -1000, mouseY = -1000;
    let animating = true;
    let lastSaveTime = Date.now();
    
    function init() {
        let container = document.querySelector('.curved-lines-bg');
        if (!container) {
            container = document.createElement('div');
            container.className = 'curved-lines-bg';
            document.body.insertBefore(container, document.body.firstChild);
        }
        
        container.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        container.appendChild(canvas);
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);
        document.addEventListener('mousemove', function(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        animate();
    }
    
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
    }
    
    function drawWave(wave, index) {
        // baseY 漂移 - 让波浪不完全平行，像漂浮在水层里
        const baseY = height * wave.y + Math.sin(time * 0.002 + index * 1.7) * 12;
        const points = 150;
        const phase = index * 2.1;
        
        // 线宽呼吸 - 像在呼吸发亮
        const breatheWidth = 1 + 0.18 * Math.sin(time * 0.003 + index * 0.8);
        const lw = wave.width * breatheWidth;
        
        // 透明度呼吸 - 灯光轻轻变强变弱
        const breatheLight = 1 + 0.15 * Math.sin(time * 0.0025 + index * 1.2);
        
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = wave.opacity * breatheLight;
        
        for (let i = 0; i <= points; i++) {
            const x = (i / points) * (width + 200) - 100;
            
            // 主波浪 - 正弦纵波
            let y = baseY;
            y += Math.sin(x * wave.frequency + wave.speed + phase) * wave.amplitude;
            
            // 叠加第二层波浪
            y += Math.sin(x * wave.frequency * 2.3 + time * wave.speed * 1.5 + phase * 0.7) * (wave.amplitude * 0.35);
            
            // 叠加第三层微波
            y += Math.sin(x * wave.frequency * 4.1 + time * wave.speed * 2.2 + phase * 1.3) * (wave.amplitude * 0.15);
            
            // 鼠标交互
            const distX = x - mouseX;
            const distY = baseY - mouseY;
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < 200) {
                const influence = (1 - dist / 200) * 25;
                y += Math.sin(x * 0.02 + time * 0.05) * influence;
            }
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // 发光效果 - 呼吸式
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = (8 + Math.sin(time * 0.025 + index) * 4) * breatheLight;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.globalAlpha = 1;
    }
    
    function animate() {
        if (!animating) return;
        
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < waves.length; i++) {
            drawWave(waves[i], i);
        }
        
        time += 0.1;
        
        // 每500ms保存一次时间状态，避免频繁写入
        if (Date.now() - lastSaveTime > 500) {
            sessionStorage.setItem('waveTime', time.toString());
            lastSaveTime = Date.now();
        }
        
        requestAnimationFrame(animate);
    }
    
    // 页面卸载前保存状态
    window.addEventListener('beforeunload', function() {
        sessionStorage.setItem('waveTime', time.toString());
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    document.addEventListener('visibilitychange', function() {
        animating = !document.hidden;
        if (animating) animate();
    });
})();






.footer_footer__6jTqE {
    position: relative;
    width: 100%;
    background-color: #101010;
    overflow: hidden
}

.footer_footer__6jTqE .footer_topContainer__sMUtI {
    position: relative;
    z-index: 1;
    padding-bottom: 4rem;
    border-bottom: 1px solid rgba(81,81,81,.5)
}

@media(orientation: landscape) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI {
        margin-bottom:2.5rem
    }
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI {
        padding-bottom:2.25rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_label__Jml0k {
    width: max-content;
    margin: 3.75rem auto 0;
    font-size: 1.25rem;
    font-family: SansMedium;
    color: #6e6e6e
}

@media(orientation: landscape) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_label__Jml0k {
        margin-top:2.5rem
    }
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_label__Jml0k {
        margin:2rem auto 0;
        font-size: 1.25rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u {
    height: 4.5rem;
    width: 23.25rem;
    box-sizing: border-box;
    margin: .75rem auto 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #191919;
    background-color: #f0f0f0;
    position: relative;
    cursor: pointer
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u {
        height:4rem;
        width: 20rem;
        margin: .375rem auto 0
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_globe__565km {
    position: absolute;
    left: 1.375rem;
    width: 2.25rem;
    height: auto;
    color: #191919
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_globe__565km {
        left:1.25rem;
        width: 2rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_text__DmOwe {
    font-size: 1.25rem;
    font-family: Segoe UI,Roboto,Helvetica Neue,Arial,PingFang SC,PingFang TC,Microsoft YaHei,Microsoft JhengHei,Hiragino Sans GB,Hiragino Kaku Gothic Pro,Yu Gothic UI,Meiryo,Apple SD Gothic Neo,Malgun Gothic,Leelawadee UI,Thonburi,Noto Sans,sans-serif;
    font-weight: 500
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_text__DmOwe {
        font-size:1.375rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_arrow__kIJ1K {
    position: absolute;
    right: 2.125rem;
    width: auto;
    height: 2.25rem;
    color: #191919;
    transition: transform .2s;
    transform: rotate(90deg)
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_arrow__kIJ1K {
        right:1.5rem;
        height: 1.75rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u.footer_active__txpDc .footer_dropDown__SAbib {
    opacity: 1;
    pointer-events: all
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u.footer_active__txpDc .footer_arrow__kIJ1K {
    transform: rotate(270deg)
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib {
    position: absolute;
    top: calc(100% + .125rem);
    left: 0;
    width: 23.25rem;
    box-sizing: border-box;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s;
    background-color: #f0f0f0;
    z-index: 1000
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib {
        top:calc(100% + .0625rem);
        width: 20rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownScroll__2rPuJ {
    height: 17.25rem
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownScroll__2rPuJ {
        height:15rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownScroll__2rPuJ .footer_contentContainer__pbw_e {
    width: 100%;
    height: max-content
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownItem__PXJos {
    position: relative;
    height: 3.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Segoe UI,Roboto,Helvetica Neue,Arial,PingFang SC,PingFang TC,Microsoft YaHei,Microsoft JhengHei,Hiragino Sans GB,Hiragino Kaku Gothic Pro,Yu Gothic UI,Meiryo,Apple SD Gothic Neo,Malgun Gothic,Leelawadee UI,Thonburi,Noto Sans,sans-serif;
    font-weight: 500;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownItem__PXJos {
        height:3.25rem;
        font-size: 1.375rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_languageItem__TXB_u .footer_dropDown__SAbib .footer_dropDownItem__PXJos:not(:first-of-type):before {
    content: "";
    position: absolute;
    top: 0;
    width: 90%;
    height: 1px;
    background-color: #888
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd {
    margin: 5rem auto 0;
    display: flex;
    width: max-content
}

@media(orientation: landscape) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd {
        margin-top:2.5rem
    }
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd {
        margin:2.5rem auto 0
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd .footer_link___h1wX span {
    display: block;
    text-align: center;
    font-size: 1.25rem;
    line-height: 1;
    font-family: SansMedium;
    color: #f0f0f0;
    cursor: pointer
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd .footer_link___h1wX span {
        font-size:.625rem
    }
}

.footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd .footer_link___h1wX:not(:first-of-type) {
    margin-left: 3rem;
    padding-left: 3rem;
    border-left: 1px solid rgba(240,240,240,.3)
}

@media(orientation: portrait) {
    .footer_footer__6jTqE .footer_topContainer__sMUtI .footer_links__rF_Sd .footer_link___h1wX:not(:first-of-type) {
        margin-left:1.5rem;
        padding-left: 1.5rem
    }
}

/*! Copyright (C) 2017 - 2025 HYPERGRYPH. All rights reserved. */
.scrollBar___MUDzO {
    border-radius: .1875rem;
    overflow: hidden;
    position: absolute;
    transition: opacity .3s ease;
    z-index: 1
}

.scrollBar___MUDzO .thumb___AIenX {
    background-color: #fff;
    border-radius: .1875rem;
    cursor: pointer;
    transition: height .3s ease .3s,width .3s ease .3s,opacity .3s linear,transform .05s linear;
    will-change: transform
}

.scrollBar___MUDzO.autoHide___wi1el {
    opacity: 0
}

.scrollBar___MUDzO.dragging___qTw89 {
    opacity: 1
}

.scrollBar___MUDzO.dragging___qTw89 .thumb___AIenX {
    transition: height .3s ease .3s,width .3s ease .3s,opacity .3s linear
}

.scrollBar___MUDzO.show___IfaJy {
    opacity: 1
}

.scroll___FG4DS {
    position: relative
}

.scroll___FG4DS .content___fxCya {
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%
}

.scroll___FG4DS .content___fxCya .contentWrapper___UanRy {
    left: 0;
    position: absolute;
    top: 0
}

.scroll___FG4DS .content___fxCya .contentWrapper___UanRy::-webkit-scrollbar {
    display: none
}

.scroll___FG4DS .content___fxCya .inner___c_1NH {
    display: flex;
    position: relative
}

.scroll___FG4DS[data-direction=y] .contentWrapper___UanRy {
    height: calc(100% - 1px);
    overflow-x: hidden;
    overflow-y: auto;
    width: calc(100% + 30px)
}

.scroll___FG4DS[data-direction=y] .contentWrapper___UanRy:not(.noMask___IQmYq) {
    -webkit-mask: linear-gradient(180deg,#fff 90%,transparent);
    mask: linear-gradient(180deg,#fff 90%,transparent)
}

.scroll___FG4DS[data-direction=y] .inner___c_1NH {
    flex-direction: column
}

.scroll___FG4DS[data-direction=y] .scrollBar___MUDzO {
    height: calc(100% - .25rem);
    right: .125rem;
    top: .125rem;
    width: .375rem
}

.scroll___FG4DS[data-direction=y] .scrollBar___MUDzO.disabled___YJoH9 {
    opacity: 0;
    pointer-events: none
}

.scroll___FG4DS[data-direction=y] .scrollBar___MUDzO .thumb___AIenX {
    width: 100%
}

.scroll___FG4DS[data-direction=x] .contentWrapper___UanRy {
    height: calc(100% + 30px);
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%
}

.scroll___FG4DS[data-direction=x] .contentWrapper___UanRy:not(.noMask___IQmYq) {
    -webkit-mask: linear-gradient(90deg,#fff 90%,transparent);
    mask: linear-gradient(90deg,#fff 90%,transparent)
}

.scroll___FG4DS[data-direction=x] .scrollBar___MUDzO {
    bottom: .125rem;
    height: .375rem;
    left: .125rem;
    width: calc(100% - .25rem)
}

.scroll___FG4DS[data-direction=x] .scrollBar___MUDzO.disabled___YJoH9 {
    opacity: 0;
    pointer-events: none
}

.scroll___FG4DS[data-direction=x] .scrollBar___MUDzO .thumb___AIenX {
    height: 100%
}

@font-face {
    font-family: ProtestStrike-Regular;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("ProtestStrike-Regular"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/ProtestStrike-Regular.7d04dd.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/ProtestStrike-Regular.8cd908.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/ProtestStrike-Regular.13abe8.ttf) format("truetype")
}

@font-face {
    font-family: Roboto-Regular;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Roboto-Regular"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Regular.978751.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Regular.47822e.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Regular.6e6837.ttf) format("truetype")
}

@font-face {
    font-family: Roboto-Black;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Roboto-Black"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Black.6e4071.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Black.6a179a.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Roboto-Black.44fd4a.ttf) format("truetype")
}

@font-face {
    font-family: Gilroy-Light;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Gilroy-Light"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Light.9981d6.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Light.d7cc70.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Light.dab230.ttf) format("truetype")
}

@font-face {
    font-family: Novecentosanswide-Bold;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Novecentosanswide-Bold"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Bold.bf8885.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Bold.11ffe5.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Bold.1fb48b.ttf) format("truetype")
}

@font-face {
    font-family: Novecentosanswide-DemiBold;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Novecentosanswide-DemiBold"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-DemiBold.089c2d.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-DemiBold.9da0ec.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-DemiBold.be3c15.ttf) format("truetype")
}

@font-face {
    font-family: Novecentosanswide-Medium;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Novecentosanswide-Medium"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Medium.748604.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Medium.ef16a8.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Novecentosanswide-Medium.b77880.ttf) format("truetype")
}

@font-face {
    font-family: Gilroy-Medium;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Gilroy-Medium"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Medium.376b06.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Medium.543de8.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-Medium.4f7868.ttf) format("truetype")
}

@font-face {
    font-family: Gilroy-ExtraBold;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Gilroy-ExtraBold"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-ExtraBold.7b2f8c.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-ExtraBold.b8f935.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/Gilroy-ExtraBold.9856d3.ttf) format("truetype")
}

@font-face {
    font-family: SpaceGrotesk;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("SpaceGrotesk"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/SpaceGrotesk.edd157.woff2) format("woff2"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/SpaceGrotesk.912379.woff) format("woff"),url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/font/SpaceGrotesk.d83d94.ttf) format("truetype")
}

body,html {
    margin: 0;
    padding: 0;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    font-family: sans-serif
}

html {
    overflow: scroll;
    overflow-x: hidden
}

html[lang=ko-kr] {
    word-break: keep-all
}

.__03-Lore_sectionDivider__RVkKY {
    margin-bottom: 2rem;
    height: 9.125rem;
    background-color: #fffa00;
    box-sizing: border-box;
    padding-left: 30.625rem;
    padding-top: 2.25rem;
    line-height: 1;
    position: relative
}

@media(orientation: portrait) {
    .__03-Lore_sectionDivider__RVkKY {
        padding-right:6.75rem;
        padding-top: 2.25rem;
        text-align: right;
        margin-bottom: 2.5rem
    }
}

.__03-Lore_sectionDivider__RVkKY:before {
    content: "";
    position: absolute;
    left: 1.5rem;
    bottom: 0;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/section_divider_icon_lore.6968c414.png);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50%;
    width: 28.25rem;
    height: 14.25rem
}

@media(orientation: portrait) {
    .__03-Lore_sectionDivider__RVkKY:before {
        left:57px;
        width: 25.425rem;
        height: 12.825rem
    }
}

.__03-Lore_sectionDivider__RVkKY .__03-Lore_dividerSubtitle__HepaK {
    font-size: 1.875rem;
    font-family: Gilroy-Light
}

.__03-Lore_sectionDivider__RVkKY .__03-Lore_dividerTitle__MhUik {
    font-size: 3.75rem;
    font-family: Gilroy-Medium
}

.__03-Lore_container__ZiS0O {
    background-color: #000;
    color: #fff;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/bg.51f75595.jpg);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50%;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 103.375rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O {
        background-image:url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/bg_m.2ac1c57d.jpg);
        height: 130rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_title__CDpIH {
    position: absolute;
    top: 12.5rem;
    left: 9.875rem;
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_title__CDpIH {
        left:9.6296296296%;
        top: 5.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ {
    position: absolute;
    left: 9.875rem;
    top: 21.875rem;
    width: 4.35rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ {
        top:6.875rem;
        right: 9.8148148148%;
        left: auto;
        width: 3.2625rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ:after,.__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ:before {
    content: "";
    display: block;
    height: .5rem;
    margin-bottom: .25rem;
    background-image: repeating-linear-gradient(90deg,#b2b2b2 0,#b2b2b2 .5rem,transparent 0,transparent .75rem)
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ:after,.__03-Lore_container__ZiS0O .__03-Lore_lattice__whvWQ:before {
        height:.375rem;
        margin-bottom: .1875rem;
        background-image: repeating-linear-gradient(90deg,#b2b2b2 0,#b2b2b2 .375rem,transparent 0,transparent .5625rem)
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6 {
    position: absolute;
    left: 9.875rem;
    top: 23.875rem;
    display: flex
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6 {
        top:5.125rem;
        right: 9.8148148148%;
        left: auto
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6:before {
    content: "";
    display: block;
    width: .5rem;
    height: 7rem;
    background-image: linear-gradient(180deg,#ff1aac 0,#ff1aac 1.5rem,#00ffa2 0,#00ffa2 3rem,#fffa00 0,rgba(255,250,0,0) 7rem)
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6:before {
        width:9.125rem;
        height: .5rem;
        background-image: linear-gradient(270deg,#ff1aac 0,#ff1aac 2rem,#00ffa2 0,#00ffa2 4rem,#fffa00 0,rgba(255,250,0,0) 9.125rem)
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6:after {
    content: "";
    display: block;
    width: .75rem;
    height: 3rem;
    background-color: #b2b2b2
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_colorBlock__cBhs6:after {
        content:none
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_codePrinter__dEVCl {
    position: absolute
}

.__03-Lore_container__ZiS0O .__03-Lore_codePrinter__dEVCl.__03-Lore_a__HR99Y {
    left: 9.75rem;
    top: 25rem;
    color: #666
}

.__03-Lore_container__ZiS0O .__03-Lore_codePrinter__dEVCl.__03-Lore_b__NVqwk {
    left: 9.75rem;
    top: 37.5rem;
    color: #4c4c4c
}

.__03-Lore_container__ZiS0O .__03-Lore_codePrinter__dEVCl.__03-Lore_c__U4AgZ {
    left: 14rem;
    top: 34rem;
    color: #fff;
    opacity: .13
}

.__03-Lore_container__ZiS0O .__03-Lore_iconLoreWrapper__d0pt_ {
    position: absolute;
    left: 12.625rem;
    top: 23.875rem;
    width: 9rem;
    height: 9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsla(0,0%,100%,.2)
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_iconLoreWrapper__d0pt_ {
        left:9.6296296296%;
        top: 15.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_iconLoreWrapper__d0pt_ .__03-Lore_iconLore__hqCg5 {
    width: 5.25rem;
    height: 5.3125rem
}

.__03-Lore_container__ZiS0O .__03-Lore_safeArea__sJzHP {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    max-width: 100%;
    width: 152.5rem;
    height: 90rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_safeArea__sJzHP {
        width:100%;
        height: 100%
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoWrapper__j7KFm {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx {
    position: absolute;
    right: 4.6875rem;
    top: 27.5rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx {
        right:auto;
        left: 50%;
        top: 68rem;
        transform: translateX(-50%)
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_activeCodename__J0dsJ {
    font-size: 7.5rem;
    line-height: 5.625rem;
    letter-spacing: 0;
    text-align: right;
    font-family: Gilroy-Light;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_activeCodename__J0dsJ {
        text-align:center;
        font-size: 8.125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_gameCode__bOpmz {
    font-size: 1.75rem;
    line-height: 1;
    letter-spacing: 0;
    text-align: right;
    margin-top: 1rem;
    font-family: Gilroy-Medium;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_gameCode__bOpmz {
        margin-left:auto;
        margin-right: auto;
        text-align: center;
        font-size: 2rem;
        margin-top: 1.5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG {
    pointer-events: auto;
    margin-top: 5.25rem;
    margin-left: auto;
    margin-right: 0;
    width: 38.625rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG {
        margin-right:auto;
        width: 54.625rem;
        margin-top: 5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY {
    height: 5.625rem;
    border-radius: 2.8125rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #131315;
    border: .1875rem solid #35373c;
    box-sizing: border-box;
    position: relative
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY {
        height:6.75rem;
        border-radius: 3.375rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet {
    width: 32.625rem;
    height: 4.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: SansRegular;
    font-size: 2.25rem;
    background-image: repeating-linear-gradient(-45deg,#1f1f22,#1f1f22 3px,transparent 0,transparent 6px)
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet {
        font-size:3rem;
        width: 47.8125rem;
        height: 5.3125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_inner__JMzst {
    display: flex;
    align-items: center;
    justify-content: center
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_paging__MWW6H {
    font-size: 1rem;
    line-height: 1;
    margin-right: 1rem;
    color: #fff000
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_paging__MWW6H {
        font-size:1.25rem;
        margin-right: 1.5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    line-height: 1.2;
    word-break: keep-all
}

.de-de .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 15.625rem;
    font-size: .9em
}

.es-mx .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 20rem;
    font-size: .75em
}

.fr-fr .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 16rem;
    font-size: .9em
}

.id-id .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    font-size: .9em
}

.it-it .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 18rem;
    font-size: .9em
}

.pt-br .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 20rem;
    font-size: .8em
}

.ru-ru .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 21rem;
    font-size: .75em
}

.th-th .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 16rem;
    font-size: .8em
}

.vi-vn .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
    max-width: 17rem;
    font-size: .8em
}

@media(orientation: portrait) {
    .de-de .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width:20rem;
        font-size: .75em
    }

    .es-mx .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 28rem;
        font-size: .75em
    }

    .fr-fr .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 25rem;
        font-size: .9em
    }

    .id-id .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        font-size: .9em
    }

    .it-it .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 22rem;
        font-size: .8em
    }

    .pt-br .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 26rem;
        font-size: .75em
    }

    .ru-ru .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 28rem;
        font-size: .75em
    }

    .th-th .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: unset;
        font-size: .8em
    }

    .vi-vn .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_activeName__BNCet .__03-Lore_name__BgJL7 {
        max-width: 24rem;
        font-size: .8em
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB {
    cursor: pointer;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: #fafafa;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB {
        width:5.3125rem;
        height: 5.3125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB:before {
    position: absolute;
    content: "";
    display: block;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: 1px solid #e7e7e7
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB:before {
        width:4.875rem;
        height: 4.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT:after {
    content: "";
    position: absolute;
    left: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-left: .375rem solid #35373c;
    transform: translateY(-50%) rotate(-45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT:after {
        left:2.25rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7:after {
    content: "";
    position: absolute;
    right: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-right: .375rem solid #35373c;
    transform: translateY(-50%) rotate(45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7:after {
        right:2.25rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT {
    left: .5rem
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7 {
    right: .5rem
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C {
    margin-top: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: .75rem 0
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C .__03-Lore_naviDot__oyw7a {
    cursor: pointer;
    margin: 0 .3125rem;
    width: 3.75rem;
    height: .3125rem;
    background-color: #414348;
    transition: transform .3s,background-color .3s,box-shadow .3s
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C .__03-Lore_naviDot__oyw7a.__03-Lore_active__0wv3R {
    background-color: #fff000;
    box-shadow: 0 0 10px #fff000
}

.__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_activeIntro__ejmyT {
    color: #999;
    white-space: pre-wrap;
    margin-top: 1.5rem;
    margin-left: auto;
    margin-right: 0;
    font-family: SansRegular;
    font-size: 1.5rem;
    line-height: 1.6;
    max-width: 37.5rem;
    text-align: left;
    text-shadow: 0 0 4px #000
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_info__r42vx .__03-Lore_activeIntro__ejmyT {
        max-width:54rem;
        margin-right: auto;
        font-size: 1.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO {
    position: absolute;
    right: 4.6875rem;
    top: 23.875rem;
    width: 43rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO {
        right:auto;
        left: 50%;
        top: 67.5rem;
        transform: translateX(-50%);
        width: 54.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_gameCode__bOpmz {
    font-size: 1.75rem;
    line-height: 1;
    letter-spacing: 0;
    font-family: Gilroy-Medium;
    white-space: nowrap;
    display: flex;
    align-items: center
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_gameCode__bOpmz:before {
    content: "";
    display: block;
    width: .75rem;
    height: .75rem;
    background-color: currentColor;
    margin-right: 1.5rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_gameCode__bOpmz {
        margin-left:auto;
        margin-right: auto;
        text-align: center;
        font-size: 2rem;
        margin-top: 1.5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_activeCodename__J0dsJ {
    font-size: 6rem;
    line-height: 5.625rem;
    margin-top: 1.5rem;
    letter-spacing: 0;
    font-family: Gilroy-Light;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_activeCodename__J0dsJ {
        font-size:8.125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_activeIntro__ejmyT {
    color: #999;
    white-space: pre-wrap;
    margin-top: 1.5rem;
    height: 20rem;
    font-family: SansRegular;
    font-size: 1.5rem;
    line-height: 1.6;
    text-align: left;
    text-shadow: 0 0 4px #000
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_activeIntro__ejmyT {
        margin-top:2.5rem;
        height: 22rem;
        font-size: 1.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG {
    pointer-events: auto;
    margin-top: 1.25rem;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG {
        margin-right:auto;
        margin-top: 5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_decoIcon__2dQOd {
    position: absolute;
    display: block;
    top: 1.25rem;
    right: 32.5rem;
    width: auto;
    height: 1.0625rem;
    color: #414349
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_decoIcon__2dQOd {
        right:41.875rem;
        height: 1.25rem;
        top: 1.5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_paging__MWW6H {
    position: absolute;
    top: 1.5rem;
    right: 17rem;
    font-size: 1rem;
    line-height: 1;
    margin-right: .5rem;
    color: #fff000
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_paging__MWW6H {
        font-size:1.25rem;
        right: 22.5rem;
        top: 1.5rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY {
    flex: none;
    margin-left: 3rem;
    margin-right: 0;
    width: 14rem;
    height: 5.625rem;
    border-radius: 2.8125rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #131315;
    border: .1875rem solid #35373c;
    box-sizing: border-box;
    position: relative
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY {
        width:19rem;
        height: 6.75rem;
        border-radius: 3.375rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY:after {
    content: "";
    display: block;
    width: 12.75rem;
    height: 4.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.25rem;
    background-image: repeating-linear-gradient(-45deg,#1f1f22,#1f1f22 3px,transparent 0,transparent 6px)
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY:after {
        width:47.8125rem;
        height: 5.3125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB {
    cursor: pointer;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: #fafafa;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB {
        width:5.3125rem;
        height: 5.3125rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB:before {
    position: absolute;
    content: "";
    display: block;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: 1px solid #e7e7e7
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB:before {
        width:4.875rem;
        height: 4.875rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT:after {
    content: "";
    position: absolute;
    left: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-left: .375rem solid #35373c;
    transform: translateY(-50%) rotate(-45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT:after {
        left:2.25rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7:after {
    content: "";
    position: absolute;
    right: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-right: .375rem solid #35373c;
    transform: translateY(-50%) rotate(45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7:after {
        right:2.25rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_prev__tjYeT {
    left: .5rem
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_navigator__ZI3wY .__03-Lore_navBtn__jGhWB.__03-Lore_next__lfnm7 {
    right: .5rem
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C {
    flex: none;
    margin-top: 1.25rem;
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: .75rem 0
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C .__03-Lore_naviDot__oyw7a {
    cursor: pointer;
    margin: 0 .3125rem;
    width: 3.75rem;
    height: .3125rem;
    background-color: #414348;
    transition: transform .3s,background-color .3s,box-shadow .3s
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C .__03-Lore_naviDot__oyw7a {
        width:4.75rem
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_infoEn__ThYtO .__03-Lore_navigation__c4xxG .__03-Lore_naviDots__woC_C .__03-Lore_naviDot__oyw7a.__03-Lore_active__0wv3R {
    background-color: #fff000;
    box-shadow: 0 0 10px #fff000
}

.__03-Lore_container__ZiS0O .__03-Lore_ringWrapper__9TbBC {
    position: absolute;
    top: 9.5rem;
    left: 25.375rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_ringWrapper__9TbBC {
        top:11rem;
        left: 50%;
        transform: translateX(-50%)
    }
}

.__03-Lore_container__ZiS0O .__03-Lore_ring__E4kwX {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ring.5ce6e2bd.png);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50%;
    width: 69.375rem;
    height: 69.375rem
}

@media(orientation: portrait) {
    .__03-Lore_container__ZiS0O .__03-Lore_ring__E4kwX {
        width:49.5rem;
        height: 49.5rem
    }
}

.__03-Lore_decoLine1__mzUNf {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    top: 33.625rem;
    left: 0;
    width: 100%;
    height: 1px
}

@media(orientation: portrait) {
    .__03-Lore_decoLine1__mzUNf {
        top:2.5rem
    }
}

.__03-Lore_decoLine2__hmNpD {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    right: 1.25rem;
    top: 0;
    width: 1px;
    height: 100%;
    -webkit-mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%);
    mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%)
}

@media(orientation: portrait) {
    .__03-Lore_decoLine2__hmNpD {
        display:none
    }
}

.__03-Lore_decoLine3__SU0mA {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    right: 3.75rem;
    top: 0;
    width: 1px;
    height: 100%;
    -webkit-mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%);
    mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%)
}

@media(orientation: portrait) {
    .__03-Lore_decoLine3__SU0mA {
        right:5%
    }
}

.__03-Lore_decoLine4__CB44A {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    left: 1.375rem;
    top: 0;
    width: 1px;
    height: 100%;
    -webkit-mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%);
    mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%)
}

@media(orientation: portrait) {
    .__03-Lore_decoLine4__CB44A {
        display:none
    }
}

.__03-Lore_decoLine5__sAIJF {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    left: 3.75rem;
    top: 0;
    width: 1px;
    height: 100%;
    -webkit-mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%);
    mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%)
}

@media(orientation: portrait) {
    .__03-Lore_decoLine5__sAIJF {
        left:5%
    }
}

.__03-Lore_decoLine6__GXe_h {
    position: absolute;
    background-color: rgba(109,109,109,.5);
    left: 29.375rem;
    top: 0;
    width: 1px;
    height: 100%;
    -webkit-mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%);
    mask: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,0) 90%)
}

@media(orientation: portrait) {
    .__03-Lore_decoLine6__GXe_h {
        left:0;
        width: 100%;
        height: 1px;
        top: 79.5rem;
        -webkit-mask: none;
        mask: none
    }
}

.__03-Lore_colorLine__jnJPV {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    max-width: 100%;
    width: 152.5rem
}

.__03-Lore_colorLine__jnJPV:after {
    content: "";
    display: block;
    width: 24.5rem;
    height: .25rem;
    margin-left: auto;
    margin-right: 1.25rem;
    background-color: #fffa00;
    background-image: linear-gradient(90deg,#ff1aac 0,#ff1aac 5.25rem,#00ffa2 0,#00ffa2 10.5rem,#fffa00 0)
}

@media(orientation: portrait) {
    .__03-Lore_colorLine__jnJPV {
        display:none
    }
}

.__03-Lore_canvasContainer__Tk9KJ {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 90rem;
    touch-action: pan-y
}

@media(orientation: portrait) {
    .__03-Lore_canvasContainer__Tk9KJ {
        height:67.5rem
    }
}

.__03-Lore_canvasContainer__Tk9KJ canvas {
    width: 100%!important;
    height: 100%!important;
    object-fit: contain;
    object-position: center
}

@font-face {
    font-family: swiper-icons;
    src: url("data:application/font-woff;charset=utf-8;base64, d09GRgABAAAAAAZgABAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGRlRNAAAGRAAAABoAAAAci6qHkUdERUYAAAWgAAAAIwAAACQAYABXR1BPUwAABhQAAAAuAAAANuAY7+xHU1VCAAAFxAAAAFAAAABm2fPczU9TLzIAAAHcAAAASgAAAGBP9V5RY21hcAAAAkQAAACIAAABYt6F0cBjdnQgAAACzAAAAAQAAAAEABEBRGdhc3AAAAWYAAAACAAAAAj//wADZ2x5ZgAAAywAAADMAAAD2MHtryVoZWFkAAABbAAAADAAAAA2E2+eoWhoZWEAAAGcAAAAHwAAACQC9gDzaG10eAAAAigAAAAZAAAArgJkABFsb2NhAAAC0AAAAFoAAABaFQAUGG1heHAAAAG8AAAAHwAAACAAcABAbmFtZQAAA/gAAAE5AAACXvFdBwlwb3N0AAAFNAAAAGIAAACE5s74hXjaY2BkYGAAYpf5Hu/j+W2+MnAzMYDAzaX6QjD6/4//Bxj5GA8AuRwMYGkAPywL13jaY2BkYGA88P8Agx4j+/8fQDYfA1AEBWgDAIB2BOoAeNpjYGRgYNBh4GdgYgABEMnIABJzYNADCQAACWgAsQB42mNgYfzCOIGBlYGB0YcxjYGBwR1Kf2WQZGhhYGBiYGVmgAFGBiQQkOaawtDAoMBQxXjg/wEGPcYDDA4wNUA2CCgwsAAAO4EL6gAAeNpj2M0gyAACqxgGNWBkZ2D4/wMA+xkDdgAAAHjaY2BgYGaAYBkGRgYQiAHyGMF8FgYHIM3DwMHABGQrMOgyWDLEM1T9/w8UBfEMgLzE////P/5//f/V/xv+r4eaAAeMbAxwIUYmIMHEgKYAYjUcsDAwsLKxc3BycfPw8jEQA/gZBASFhEVExcQlJKWkZWTl5BUUlZRVVNXUNTQZBgMAAMR+E+gAEQFEAAAAKgAqACoANAA+AEgAUgBcAGYAcAB6AIQAjgCYAKIArAC2AMAAygDUAN4A6ADyAPwBBgEQARoBJAEuATgBQgFMAVYBYAFqAXQBfgGIAZIBnAGmAbIBzgHsAAB42u2NMQ6CUAyGW568x9AneYYgm4MJbhKFaExIOAVX8ApewSt4Bic4AfeAid3VOBixDxfPYEza5O+Xfi04YADggiUIULCuEJK8VhO4bSvpdnktHI5QCYtdi2sl8ZnXaHlqUrNKzdKcT8cjlq+rwZSvIVczNiezsfnP/uznmfPFBNODM2K7MTQ45YEAZqGP81AmGGcF3iPqOop0r1SPTaTbVkfUe4HXj97wYE+yNwWYxwWu4v1ugWHgo3S1XdZEVqWM7ET0cfnLGxWfkgR42o2PvWrDMBSFj/IHLaF0zKjRgdiVMwScNRAoWUoH78Y2icB/yIY09An6AH2Bdu/UB+yxopYshQiEvnvu0dURgDt8QeC8PDw7Fpji3fEA4z/PEJ6YOB5hKh4dj3EvXhxPqH/SKUY3rJ7srZ4FZnh1PMAtPhwP6fl2PMJMPDgeQ4rY8YT6Gzao0eAEA409DuggmTnFnOcSCiEiLMgxCiTI6Cq5DZUd3Qmp10vO0LaLTd2cjN4fOumlc7lUYbSQcZFkutRG7g6JKZKy0RmdLY680CDnEJ+UMkpFFe1RN7nxdVpXrC4aTtnaurOnYercZg2YVmLN/d/gczfEimrE/fs/bOuq29Zmn8tloORaXgZgGa78yO9/cnXm2BpaGvq25Dv9S4E9+5SIc9PqupJKhYFSSl47+Qcr1mYNAAAAeNptw0cKwkAAAMDZJA8Q7OUJvkLsPfZ6zFVERPy8qHh2YER+3i/BP83vIBLLySsoKimrqKqpa2hp6+jq6RsYGhmbmJqZSy0sraxtbO3sHRydnEMU4uR6yx7JJXveP7WrDycAAAAAAAH//wACeNpjYGRgYOABYhkgZgJCZgZNBkYGLQZtIJsFLMYAAAw3ALgAeNolizEKgDAQBCchRbC2sFER0YD6qVQiBCv/H9ezGI6Z5XBAw8CBK/m5iQQVauVbXLnOrMZv2oLdKFa8Pjuru2hJzGabmOSLzNMzvutpB3N42mNgZGBg4GKQYzBhYMxJLMlj4GBgAYow/P/PAJJhLM6sSoWKfWCAAwDAjgbRAAB42mNgYGBkAIIbCZo5IPrmUn0hGA0AO8EFTQAA");
    font-weight: 400;
    font-style: normal
}

:root {
    --swiper-theme-color: #007aff
}

:host {
    position: relative;
    display: block;
    margin-left: auto;
    margin-right: auto;
    z-index: 1
}

.swiper {
    margin-left: auto;
    margin-right: auto;
    position: relative;
    overflow: hidden;
    list-style: none;
    padding: 0;
    z-index: 1;
    display: block
}

.swiper-vertical>.swiper-wrapper {
    flex-direction: column
}

.swiper-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 1;
    display: flex;
    transition-property: transform;
    transition-timing-function: var(--swiper-wrapper-transition-timing-function,initial);
    box-sizing: content-box
}

.swiper-android .swiper-slide,.swiper-ios .swiper-slide,.swiper-wrapper {
    transform: translateZ(0)
}

.swiper-horizontal {
    touch-action: pan-y
}

.swiper-vertical {
    touch-action: pan-x
}

.swiper-slide {
    flex-shrink: 0;
    width: 100%;
    height: 100%;
    position: relative;
    transition-property: transform;
    display: block
}

.swiper-slide-invisible-blank {
    visibility: hidden
}

.swiper-autoheight,.swiper-autoheight .swiper-slide {
    height: auto
}

.swiper-autoheight .swiper-wrapper {
    align-items: flex-start;
    transition-property: transform,height
}

.swiper-backface-hidden .swiper-slide {
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden
}

.swiper-3d.swiper-css-mode .swiper-wrapper {
    perspective: 1200px
}

.swiper-3d .swiper-wrapper {
    transform-style: preserve-3d
}

.swiper-3d {
    perspective: 1200px
}

.swiper-3d .swiper-cube-shadow,.swiper-3d .swiper-slide {
    transform-style: preserve-3d
}

.swiper-css-mode>.swiper-wrapper {
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none
}

.swiper-css-mode>.swiper-wrapper::-webkit-scrollbar {
    display: none
}

.swiper-css-mode>.swiper-wrapper>.swiper-slide {
    scroll-snap-align: start start
}

.swiper-css-mode.swiper-horizontal>.swiper-wrapper {
    scroll-snap-type: x mandatory
}

.swiper-css-mode.swiper-vertical>.swiper-wrapper {
    scroll-snap-type: y mandatory
}

.swiper-css-mode.swiper-free-mode>.swiper-wrapper {
    scroll-snap-type: none
}

.swiper-css-mode.swiper-free-mode>.swiper-wrapper>.swiper-slide {
    scroll-snap-align: none
}

.swiper-css-mode.swiper-centered>.swiper-wrapper:before {
    content: "";
    flex-shrink: 0;
    order: 9999
}

.swiper-css-mode.swiper-centered>.swiper-wrapper>.swiper-slide {
    scroll-snap-align: center center;
    scroll-snap-stop:always}

.swiper-css-mode.swiper-centered.swiper-horizontal>.swiper-wrapper>.swiper-slide:first-child {
    -webkit-margin-start: var(--swiper-centered-offset-before);
    margin-inline-start:var(--swiper-centered-offset-before)}

.swiper-css-mode.swiper-centered.swiper-horizontal>.swiper-wrapper: before {
    height:100%;
    min-height: 1px;
    width: var(--swiper-centered-offset-after)
}

.swiper-css-mode.swiper-centered.swiper-vertical>.swiper-wrapper>.swiper-slide:first-child {
    -webkit-margin-before: var(--swiper-centered-offset-before);
    margin-block-start:var(--swiper-centered-offset-before)}

.swiper-css-mode.swiper-centered.swiper-vertical>.swiper-wrapper: before {
    width:100%;
    min-width: 1px;
    height: var(--swiper-centered-offset-after)
}

.swiper-3d .swiper-slide-shadow,.swiper-3d .swiper-slide-shadow-bottom,.swiper-3d .swiper-slide-shadow-left,.swiper-3d .swiper-slide-shadow-right,.swiper-3d .swiper-slide-shadow-top {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10
}

.swiper-3d .swiper-slide-shadow {
    background: rgba(0,0,0,.15)
}

.swiper-3d .swiper-slide-shadow-left {
    background-image: linear-gradient(270deg,rgba(0,0,0,.5),rgba(0,0,0,0))
}

.swiper-3d .swiper-slide-shadow-right {
    background-image: linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,0))
}

.swiper-3d .swiper-slide-shadow-top {
    background-image: linear-gradient(0deg,rgba(0,0,0,.5),rgba(0,0,0,0))
}

.swiper-3d .swiper-slide-shadow-bottom {
    background-image: linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0))
}

.swiper-lazy-preloader {
    width: 42px;
    height: 42px;
    position: absolute;
    left: 50%;
    top: 50%;
    margin-left: -21px;
    margin-top: -21px;
    z-index: 10;
    transform-origin: 50%;
    box-sizing: border-box;
    border-radius: 50%;
    border: 4px solid var(--swiper-preloader-color,var(--swiper-theme-color));
    border-top: 4px solid transparent
}

.swiper-watch-progress .swiper-slide-visible .swiper-lazy-preloader,.swiper:not(.swiper-watch-progress) .swiper-lazy-preloader {
    animation: swiper-preloader-spin 1s linear infinite
}

.swiper-lazy-preloader-white {
    --swiper-preloader-color: #fff
}

.swiper-lazy-preloader-black {
    --swiper-preloader-color: #000
}

@keyframes swiper-preloader-spin {
    0% {
        transform: rotate(0deg)
    }

    to {
        transform: rotate(1turn)
    }
}

.__04-Information_sectionContainer__OXMtV {
    position: relative;
    width: 100%;
    height: 90rem;
    box-sizing: border-box;
    background-color: #000;
    color: #fff
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV {
        height:110.25rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_sectionTitle__FUx0p {
    position: absolute;
    top: 12.5rem;
    left: 9.875rem;
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_sectionTitle__FUx0p {
        left:9.6296296296%;
        top: 5.875rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5 {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%
}

.__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5 video {
    position: absolute;
    right: 0;
    top: 0;
    width: 90%;
    height: 90%;
    object-fit: cover;
    object-position: center;
    transition: opacity .6s
}

.__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5 video.__04-Information_fadeOut__fhF1z {
    opacity: 0
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5 video {
        width:100%;
        height: 95rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5:after {
    pointer-events: none;
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,.2);
    background-image: linear-gradient(180deg,rgba(0,0,0,0) 40%,rgb(0,0,0) 90%),linear-gradient(270deg,rgba(0,0,0,0) 50%,rgb(0,0,0) 90%)
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_bgVideo__UjdV5:after {
        background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgb(0,0,0) 80%),linear-gradient(270deg,rgba(0,0,0,0) 50%,rgba(0,0,0,.6) 85%,rgba(0,0,0,.8))
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_decoLine__QUesO {
    position: absolute;
    height: 1px;
    width: 100%;
    bottom: 16.875rem;
    left: 0;
    background-image: linear-gradient(90deg,#fdfd1f 40%,rgba(253,253,31,0) 75%)
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_decoLine__QUesO {
        bottom:15.125rem;
        background-image: none;
        background-color: #fdfd1f
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_blurredLogo__Lt_Ek {
    position: absolute;
    top: 39rem;
    left: 6.5rem;
    width: 47.1875rem;
    height: 41rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_blurredLogo__Lt_Ek {
        left:auto;
        top: auto;
        right: 0;
        bottom: 6rem;
        width: 26.125rem;
        height: 22.625rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 {
    position: absolute;
    bottom: 7.375rem;
    right: 0;
    width: 96.1875rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 {
        right:auto;
        left: 50%;
        bottom: 31.625rem;
        transform: translateX(-50%);
        width: 104.625rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideoListFallback__DULfO {
    display: flex;
    align-items: center;
    justify-content: center
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    height: 19rem
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ {
    flex: none;
    background-color: #000;
    position: relative;
    width: 33.75rem;
    height: 100%;
    display: flex;
    align-items: flex-end;
    transform-origin: bottom
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ {
        transform-origin:center
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ .__04-Information_mask__A6_HD {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60%;
    background-image: linear-gradient(180deg,rgba(0,0,0,0) 0,black)
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 30%;
    background-image: linear-gradient(180deg,rgba(253,253,31,0) 0,rgba(253,253,31,.5) 60%,#fdfd1f)
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ {
    filter: brightness(.5);
    transform: scale(.8);
    transition: filter .3s ease-out,transform .3s ease-out
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ {
        transform:scale(.9)
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_ .__04-Information_mask__A6_HD {
    opacity: 1;
    transition: opacity .3s ease-out
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9 .__04-Information_coverBox__Gfhd_:after {
    opacity: 0;
    transition: opacity .3s ease-out
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9.__04-Information_active__8CCkr .__04-Information_coverBox__Gfhd_ {
    filter: brightness(1);
    transform: scale(1)
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9.__04-Information_active__8CCkr .__04-Information_coverBox__Gfhd_ .__04-Information_mask__A6_HD {
    opacity: 0
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_infoVideo__p2Hg9.__04-Information_active__8CCkr .__04-Information_coverBox__Gfhd_:after {
    opacity: 1
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 {
    pointer-events: none;
    position: absolute;
    z-index: 2;
    width: 33.75rem;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%)
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navInfo__iyDn2 {
    position: absolute;
    bottom: 4.125rem;
    font-family: SansRegular;
    font-size: 1.125rem;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navInfo__iyDn2 {
        font-size:1.5rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navInfo__iyDn2 .__04-Information_tag__xJ2hT {
    margin: 0 .75rem;
    color: #fdfd1f
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navInfo__iyDn2.__04-Information_prev__8LyRZ {
    right: 37.5rem
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navInfo__iyDn2.__04-Information_next__o_q5o {
    left: 37.5rem
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd {
    pointer-events: auto;
    cursor: pointer;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: #fafafa;
    position: absolute;
    bottom: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd {
        width:5.375rem;
        height: 5.375rem;
        bottom: 2.25rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd:before {
    position: absolute;
    content: "";
    display: block;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: 1px solid #e7e7e7
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd:before {
        width:4.75rem;
        height: 4.75rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_prev__8LyRZ:after {
    content: "";
    position: absolute;
    left: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-left: .375rem solid #35373c;
    transform: translateY(-50%) rotate(-45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_prev__8LyRZ:after {
        left:2.25rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_next__o_q5o:after {
    content: "";
    position: absolute;
    right: 1.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    border-top: .375rem solid #35373c;
    border-right: .375rem solid #35373c;
    transform: translateY(-50%) rotate(45deg);
    background: rgba(0,0,0,0);
    pointer-events: none
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_next__o_q5o:after {
        right:2.25rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_prev__8LyRZ {
    left: -2.25rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_prev__8LyRZ {
        left:-2.75rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_next__o_q5o {
    right: -2.25rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoVideos__iDIo3 .__04-Information_navContainer__rqqK9 .__04-Information_navBtn__Fvvsd.__04-Information_next__o_q5o {
        right:-2.75rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q {
    position: absolute;
    bottom: 9.5rem;
    left: 10rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q {
        left:9.6296296296%;
        bottom: 6.75rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_tagAndDate__T0klz {
    font-size: 1.5rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_tagAndDate__T0klz {
        font-size:2rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_tagAndDate__T0klz .__04-Information_tag__xJ2hT {
    display: inline-block;
    padding: 2px .5em;
    background-color: #38383a;
    color: #fff;
    border-radius: 2px;
    margin-right: 2rem
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_tagAndDate__T0klz .__04-Information_date__woGpE {
    color: #fdfd1f;
    font-family: SansRegular
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_title__nPfW6 {
    width: 45rem;
    font-size: 2rem;
    line-height: 1.8
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_title__nPfW6 {
        margin-top:.75rem;
        font-size: 3rem;
        line-height: 1.4;
        height: 2.8em;
        width: 55.125rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d {
    display: flex;
    margin-top: 5.25rem
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d {
        margin-top:5.375rem;
        height: 5.625rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_playBtn__pFvtR {
    cursor: pointer;
    width: 4.5rem;
    height: 4.5rem;
    background-color: #fdfd1f;
    border-radius: 2px;
    margin-right: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color .2s ease
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_playBtn__pFvtR {
        width:5.625rem;
        height: 5.625rem;
        margin-right: 1.5rem
    }
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_playBtn__pFvtR:after {
    content: "";
    display: block;
    border-left: 1.25rem solid #35373c;
    border-top: .75rem solid rgba(0,0,0,0);
    border-bottom: .75rem solid rgba(0,0,0,0);
    margin-left: .25rem;
    transition: transform .2s ease
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_playBtn__pFvtR:hover {
    background-color: #fafafa
}

.__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_playBtn__pFvtR:hover:after {
    transform: scale(1.25)
}

@media(orientation: portrait) {
    .__04-Information_sectionContainer__OXMtV .__04-Information_infoCurrent__Hcu3q .__04-Information_buttons__Wh_5d .__04-Information_button__4GEKK {
        height:5.625rem
    }
}

.players_videoContainer__Ahx_s {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #000
}

.players_videoContainer__Ahx_s video {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover
}

.players_videoContainer__Ahx_s video .players_videoInDom__dUdna {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    transform: translate3d(-50%,-50%,0);
    width: 1px;
    height: 1px
}

.players_videoContainer__Ahx_s canvas,.players_videoContainer__Ahx_s img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA.GameplayAlbum_aic__COk_i {
        position:absolute;
        left: calc(50% - 80rem + 3.75rem + 28.3125rem);
        top: 5.75rem
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA.GameplayAlbum_aic__COk_i .GameplayAlbum_imageContainer__g5rE9 {
    position: relative
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA.GameplayAlbum_aic__COk_i .GameplayAlbum_imageContainer__g5rE9 {
        left:-19rem;
        flex-direction: row-reverse
    }

    .GameplayAlbum_gameplayAlbum__iz9mA.GameplayAlbum_aic__COk_i .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P {
        background-color: #ededed
    }

    .GameplayAlbum_gameplayAlbum__iz9mA.GameplayAlbum_gameplay__pWYWA {
        position: absolute;
        left: calc(50% - 80rem + 3.75rem + 38rem);
        top: 30.375rem
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP {
    position: absolute;
    top: 0;
    left: calc(50% - 31.25rem);
    width: 8.25rem;
    height: 100%;
    background-color: #fffa00;
    overflow: hidden
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP {
        display:none
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP .GameplayAlbum_line__HU5C5 {
    position: absolute;
    left: 1rem;
    bottom: calc(100% - 3.9375rem);
    width: calc(100vh - 9.625rem - 3.9375rem);
    height: 2.25rem;
    transform-origin: left bottom;
    transform: rotate(90deg);
    background-color: #fff
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP .GameplayAlbum_line__HU5C5 .GameplayAlbum_title__OF3Ck {
    position: absolute;
    left: .875rem;
    bottom: .375rem;
    font-size: 3.5rem;
    white-space: nowrap;
    font-family: Novecentosanswide-DemiBold;
    line-height: 1;
    text-transform: uppercase;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP .GameplayAlbum_line__HU5C5 .GameplayAlbum_endfield__EaJKQ {
    position: absolute;
    left: .875rem;
    bottom: .625rem;
    width: 15.3125rem;
    height: auto;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP .GameplayAlbum_line__HU5C5 .GameplayAlbum_deco__7IAcX {
    position: absolute;
    top: .5rem;
    right: 1.125rem;
    width: 10.375rem;
    height: auto
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_H5DecoLine__BB2MP .GameplayAlbum_line__HU5C5 .GameplayAlbum_ak__S50eM {
    position: absolute;
    left: .9375rem;
    bottom: 3.75rem;
    line-height: 1;
    font-family: Gilroy-Medium;
    font-size: 1.125rem;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 {
    position: relative;
    width: 111.5rem;
    height: 54.375rem;
    overflow: hidden;
    display: flex
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 {
        position:absolute;
        left: 50%;
        top: 30.125rem;
        width: 80rem;
        height: 45rem;
        transform: translate3d(-50%,0,0)
    }
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P {
        position:relative;
        top: 0;
        right: 0;
        width: 19rem;
        height: 100%;
        background-color: #fffa00
    }
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P {
        display:none
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P .GameplayAlbum_line__HU5C5 {
    position: absolute;
    left: 1.875rem;
    bottom: calc(100% - 1.5rem);
    width: 51.5rem;
    height: 2.25rem;
    transform-origin: left bottom;
    transform: rotate(90deg);
    background-color: #fff
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P .GameplayAlbum_line__HU5C5 .GameplayAlbum_endfield__EaJKQ {
    position: absolute;
    left: .625rem;
    bottom: .75rem;
    width: 22.125rem;
    height: auto;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P .GameplayAlbum_line__HU5C5 .GameplayAlbum_title__OF3Ck {
    position: absolute;
    left: .625rem;
    bottom: .5rem;
    white-space: nowrap;
    font-family: Novecentosanswide-DemiBold;
    font-size: 4.5rem;
    text-transform: uppercase;
    line-height: 1;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P .GameplayAlbum_line__HU5C5 .GameplayAlbum_deco__7IAcX {
    position: absolute;
    top: .5rem;
    right: 1.125rem;
    width: 10.375rem;
    height: auto
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_imageContainer__g5rE9 .GameplayAlbum_rightDeco__Z0B_P .GameplayAlbum_line__HU5C5 .GameplayAlbum_ak__S50eM {
    position: absolute;
    left: .75rem;
    bottom: 5rem;
    line-height: 1;
    font-family: Gilroy-Medium;
    font-size: 1.5rem;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl {
    position: relative;
    width: 92.4375rem;
    height: 54.375rem
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl {
        width:100%;
        height: 100%
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_wrapper__txj_c {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_bottom__2HAo8,.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_middle__k5O96,.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_top__WEabr {
    position: absolute;
    display: block;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_middle__k5O96 {
    filter: grayscale(1) brightness(.76) contrast(200) url(#red-green)
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl .GameplayAlbum_bottom__2HAo8 {
    background-color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_image__HfiGl div.GameplayAlbum_middle__k5O96 {
    background-color: #fffa00
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_h5ImageContainer__d_h_h {
    position: absolute;
    left: 50%;
    top: 30.125rem;
    width: 80rem;
    height: 45rem;
    transform: translate3d(-50%,0,0)
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_h5ImageContainer__d_h_h {
        display:none
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_h5ImageContainer__d_h_h img {
    width: 100%;
    height: 100%;
    object-fit: cover
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_pagination__I3EXE {
    position: absolute;
    left: 2.25rem;
    bottom: -1.3125rem;
    opacity: 0
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_pagination__I3EXE {
        display:none
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_paginationH5__us0Uj {
    position: absolute;
    width: 18.1875rem;
    left: calc(50% - 18.1875rem);
    top: 95.0625rem
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_paginationH5__us0Uj {
        display:none
    }
}

html[data-oversea=true] .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_paginationH5__us0Uj {
    top: 98.625rem
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC {
    position: absolute;
    left: 2.4375rem;
    top: 58rem;
    color: #191919
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_index__GY_gZ {
    position: absolute;
    top: -.25rem;
    left: -2.5rem;
    font-family: Novecentosanswide-Medium;
    font-size: 2rem;
    transform: scale(.5);
    transform-origin: left top;
    color: #191919
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC {
        left:calc(50% - 18.1875rem);
        top: 77.875rem
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_title__OF3Ck {
    font-family: SansMedium;
    font-size: 3rem;
    line-height: 1
}

@media(orientation: portrait) {
    html[lang=ru-ru] .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_title__OF3Ck {
        letter-spacing:-.04em
    }
}

@media(orientation: landscape) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_descriptionContainer__iSXAy {
        width:90.125rem;
        height: 11.5rem
    }
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_descriptionContainer__iSXAy {
        width:57.5rem;
        height: 16.5rem
    }
}

.GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_description__Q9cid {
    margin-top: .75rem;
    max-width: 57.5rem;
    font-family: SansMedium;
    font-size: 1.875rem;
    line-height: 1.5
}

@media(orientation: portrait) {
    .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_description__Q9cid {
        max-width:45.375rem
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .GameplayAlbum_gameplayAlbum__iz9mA .GameplayAlbum_detail__sLWiC .GameplayAlbum_description__Q9cid {
        max-width:90.125rem
    }
}

.__05-Gameplay_sectionContainer__LN64O {
    position: relative;
    width: 100%;
    height: 104.75rem;
    box-sizing: border-box
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O {
        height:110.5rem
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_endfieldPre__LUcJv {
    position: absolute;
    top: 8.125rem;
    height: 15.625rem;
    width: 100%;
    overflow: hidden
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_endfieldPre__LUcJv .__05-Gameplay_icon__Yiqki {
    position: absolute;
    height: 100%;
    width: auto
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_endfieldPre__LUcJv .__05-Gameplay_icon__Yiqki .__05-Gameplay_ef__xDMnp {
    position: relative;
    height: 100%;
    width: auto
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_pageTitle__JHeDq {
    position: absolute;
    top: 31.25rem;
    left: calc(50% - 61.875rem - 3.75rem);
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_pageTitle__JHeDq {
        left:calc(50% - 18.1875rem);
        top: 18.0625rem
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT {
    position: absolute;
    top: 40.25rem;
    left: calc(50% - 61.875rem - 3.75rem);
    color: #999;
    opacity: 0
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT {
        top:25.3125rem;
        left: calc(50% - 18.1875rem);
        opacity: 1
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT .__05-Gameplay_title__wtOJu {
    position: absolute;
    left: -.5rem;
    width: 8.8125rem;
    height: auto
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT .__05-Gameplay_blocks__mdVoM {
    position: absolute;
    top: 3.375rem;
    width: 3.9375rem;
    height: auto
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT .__05-Gameplay_blocks__mdVoM {
        display:none
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT .__05-Gameplay_codePrinter__6LHyV {
    position: absolute;
    left: 0;
    top: 6.9375rem
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT .__05-Gameplay_codePrinter__6LHyV {
        display:none
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT:after {
    content: "";
    position: absolute;
    left: 0;
    top: 5.25rem;
    width: 1.125rem;
    height: 7.0625rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/color-bar.1f0aa038.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

@keyframes __05-Gameplay_flashing__W8_Z1 {
    0% {
        opacity: 0
    }

    10% {
        opacity: .5
    }

    11% {
        opacity: 0
    }

    20% {
        opacity: .5
    }

    21% {
        opacity: 0
    }

    40% {
        opacity: .5
    }

    41% {
        opacity: 0
    }

    to {
        opacity: 1
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_decoLeft__u4hlT.__05-Gameplay_active__Ers8s {
    animation: __05-Gameplay_flashing__W8_Z1 1s ease-out forwards
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_itemIcon__OsONf {
    position: absolute;
    left: calc(50% - 61.875rem - 3.75rem);
    top: 75.5rem;
    width: 9.25rem;
    height: 9.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #d9d9d9;
    opacity: 0
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_itemIcon__OsONf {
        top:18.0625rem;
        left: calc(50% + 24.25rem);
        width: 5.25rem;
        height: 5.25rem
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_itemIcon__OsONf .__05-Gameplay_icon__Yiqki {
    width: 5.6875rem;
    height: auto;
    color: #a6a6a6
}

@media(orientation: portrait) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_itemIcon__OsONf .__05-Gameplay_icon__Yiqki {
        width:3.625rem
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG {
    position: absolute;
    top: 0;
    left: calc(50% - 31.25rem);
    width: 8.25rem;
    height: 100%;
    background-color: #fffa00;
    overflow: hidden
}

@media(orientation: landscape) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG {
        display:none
    }
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG .__05-Gameplay_line__ONbLs {
    position: absolute;
    left: 1rem;
    bottom: calc(100% - 3.9375rem);
    width: calc(100vh - 9.625rem - 3.9375rem);
    height: 2.25rem;
    transform-origin: left bottom;
    transform: rotate(90deg);
    background-color: #fff
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG .__05-Gameplay_line__ONbLs .__05-Gameplay_endfield__On6a0 {
    position: absolute;
    left: .875rem;
    bottom: .625rem;
    width: 15.3125rem;
    height: auto;
    color: #191919
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG .__05-Gameplay_line__ONbLs .__05-Gameplay_deco__U6KyP {
    position: absolute;
    top: .5rem;
    right: 1.125rem;
    width: 10.375rem;
    height: auto
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_H5DecoLine__F59RG .__05-Gameplay_line__ONbLs .__05-Gameplay_ak__ICShZ {
    position: absolute;
    left: .9375rem;
    bottom: 3.75rem;
    line-height: 1;
    font-family: Gilroy-Medium;
    font-size: 1.125rem;
    color: #191919
}

.__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_h5Icon__CRlhV {
    position: absolute;
    top: 4.625rem;
    left: calc(50% - 18.6875rem);
    height: 7.5rem;
    width: auto
}

@media(orientation: landscape) {
    .__05-Gameplay_sectionContainer__LN64O .__05-Gameplay_h5Icon__CRlhV {
        display:none
    }
}

.Carousel_carousel__FKamY,.Carousel_container__tAcTx {
    position: relative;
    width: 100%;
    height: 100%
}

.Carousel_container__tAcTx {
    display: flex;
    align-items: center
}

.Carousel_item__85leB {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    transition: transform .4s ease-in-out
}

.__06-Notice_sectionContainer__2x0Mi {
    position: relative;
    width: 100%;
    height: 85.25rem
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi {
        height:110.5rem
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_carouselContainer__2AoYR {
    position: absolute;
    left: calc(50% - 51.0625rem - 3.75rem);
    top: 18.875rem;
    width: 152.5rem;
    height: 60.4375rem;
    -webkit-mask-image: linear-gradient(90deg,transparent 0,rgb(0,0,0) 1.5rem,rgb(0,0,0) 151rem,transparent);
    mask-image: linear-gradient(90deg,transparent 0,rgb(0,0,0) 1.5rem,rgb(0,0,0) 151rem,transparent)
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_carouselContainer__2AoYR {
        display:none
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_carouselContentContainer__ZTu_O {
    position: absolute;
    left: 1.5rem;
    top: 16.3125rem;
    width: 55rem;
    height: 30.9375rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_carouselPagination__XTWO2 {
    position: absolute;
    top: 50.625rem;
    left: 1.5rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_pageTitle__XJGX0 {
    position: absolute;
    top: 13.5rem;
    left: calc(50% - 49.5625rem - 3.75rem);
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_pageTitle__XJGX0 {
        left:calc(50% - 18.1875rem);
        top: 5.5rem
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 {
    position: absolute;
    left: calc(50% - 62.75rem - 3.75rem);
    top: 8.6875rem;
    width: 8.25rem;
    height: 70.625rem;
    display: flex;
    flex-direction: column;
    align-items: center
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 {
        top:0;
        left: calc(50% - 31.25rem);
        width: 8.25rem;
        height: 100%
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_topPart__HhZJm {
    position: absolute;
    top: 2.75rem;
    left: calc(50% - 10.375rem);
    width: 20.8125rem;
    height: 22.8125rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/tower-top.768f88af.png)
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_wrapper__g1OkM {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    overflow: hidden;
    background-color: #fffa00
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_wrapper__g1OkM .__06-Notice_bottomPart__xrJ5d {
    position: absolute;
    top: 2.75rem;
    left: calc(50% - 10.375rem);
    width: 20.8125rem;
    height: 22.8125rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/tower-bottom.eb021e6c.png)
}

@media(orientation: landscape) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_wrapper__g1OkM .__06-Notice_bottomPart__xrJ5d {
        -webkit-mask-image:linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,.1));
        mask-image: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 60%,rgba(0,0,0,.1))
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 {
    position: absolute;
    top: 51.9375rem;
    display: flex;
    flex-direction: column;
    align-items: center
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 {
        top:unset;
        bottom: 6.75rem
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h {
    position: relative;
    font-size: 2.25rem;
    line-height: 1;
    font-family: SansBold;
    color: #2e2e2e
}

html[data-oversea=true] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h {
    letter-spacing: -.05em
}

html[lang=es-mx] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h,html[lang=fr-fr] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h,html[lang=it-it] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h,html[lang=pt-br] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h,html[lang=vi-vn] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h {
    display: none
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_latest__ySg6h {
        display:none
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x {
    position: relative;
    margin-top: 1.25rem;
    width: 4.5rem;
    height: 2px;
    background-color: #626262
}

@media(orientation: portrait) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x {
        display:none
    }
}

html[data-oversea=true] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x {
    width: 6rem
}

html[lang=es-mx] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x,html[lang=fr-fr] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x,html[lang=it-it] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x,html[lang=pt-br] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x,html[lang=vi-vn] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3 .__06-Notice_divider__1U63x {
    width: 4.5rem;
    margin-top: 3.5rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_leftDeco__ML9u3 .__06-Notice_textWrapper__nvUA3:after {
    content: "";
    position: relative;
    display: block;
    margin-top: 1.5rem;
    margin-left: .25rem;
    width: 3.6875rem;
    height: 10.875rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/left-deco-text.3ef6b598.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_noticeItem__7v58F {
    position: relative;
    width: 55rem;
    height: 30.9375rem;
    border-radius: .5rem;
    overflow: hidden;
    box-shadow: 0 0 .5rem rgba(0,0,0,.25);
    transform: scale(.818);
    transition: transform .4s ease-in-out;
    cursor: pointer
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_noticeItem__7v58F.__06-Notice_active__SIJCS {
    transform: scale(1)
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_noticeItem__7v58F.__06-Notice_active__SIJCS:after {
    opacity: 0
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_noticeItem__7v58F:after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: rgba(0,0,0,.5);
    opacity: 1;
    transition: opacity .4s ease-in-out
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_noticeItem__7v58F .__06-Notice_image__3ztHF {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/test-notice-bg.9814ba3c.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_titleContainer__xNob9 {
    position: absolute;
    top: 7.75rem;
    margin-left: 1.5rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_titleContainer__xNob9 .__06-Notice_subtitle__T6dJ9 {
    position: relative;
    white-space: nowrap;
    font-size: 1.5rem;
    line-height: 1;
    color: gray;
    font-family: SansMedium
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_titleContainer__xNob9 .__06-Notice_subtitle__T6dJ9 .__06-Notice_time__D8fRI {
    padding-left: 1.75rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_titleContainer__xNob9 .__06-Notice_title__YvY2R {
    position: relative;
    margin-top: 1.25rem;
    max-width: 110rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1;
    font-weight: 500;
    font-size: 2.25rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_titleContainer__xNob9:after {
    content: "";
    position: relative;
    display: block;
    margin-top: 1.1875rem;
    height: 2px;
    width: 149.5rem;
    background-color: #d9d9d9
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_detailButton__1qReQ {
    position: absolute;
    top: 51rem;
    left: 18.75rem
}

@media(orientation: landscape) {
    html[lang=es-mx] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_detailButton__1qReQ {
        font-size:1.5rem
    }

    html[lang=it-it] .__06-Notice_sectionContainer__2x0Mi .__06-Notice_detailButton__1qReQ {
        font-size: 1.375rem
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentWrapper__Eqjzg {
    pointer-events: auto
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo {
    position: absolute;
    left: calc(50% - 18.1875rem);
    top: 16.125rem
}

@media(orientation: landscape) {
    .__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo {
        display:none
    }
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt {
    width: 45.375rem;
    height: 38.25rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_image__3ztHF {
    width: 45.375rem;
    height: 25.875rem;
    border-radius: .5rem;
    box-shadow: 0 0 .5rem rgba(0,0,0,.25);
    background-color: #fff;
    overflow: hidden
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_image__3ztHF img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: .5rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_subtitle__T6dJ9 {
    margin-top: 2rem;
    height: 2.375rem;
    display: flex;
    font-size: 1.875rem;
    font-family: SansMedium;
    color: gray
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_subtitle__T6dJ9 .__06-Notice_type__2IeVk {
    height: 100%;
    min-width: 7.875rem;
    width: max-content;
    padding: 0 1rem;
    line-height: 2.375rem;
    background-color: #f2f2f2;
    text-align: center
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_subtitle__T6dJ9 .__06-Notice_date__pG4fQ {
    margin-left: 2rem;
    line-height: 2.375rem
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_bulletinList__gTFKV .__06-Notice_bulletinItem__ckhFt .__06-Notice_title__YvY2R {
    margin-top: 1rem;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: 2.25rem;
    line-height: 1.25;
    color: #191919;
    font-family: Segoe UI,Roboto,Helvetica Neue,Arial,PingFang SC,PingFang TC,Microsoft YaHei,Microsoft JhengHei,Hiragino Sans GB,Hiragino Kaku Gothic Pro,Yu Gothic UI,Meiryo,Apple SD Gothic Neo,Malgun Gothic,Leelawadee UI,Thonburi,Noto Sans,sans-serif
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_pagination__P2NOK {
    position: absolute;
    top: 76.8125rem;
    left: 0
}

.__06-Notice_sectionContainer__2x0Mi .__06-Notice_h5ContentContainer__QWOjo .__06-Notice_detailButton__1qReQ {
    position: absolute;
    top: 77.25rem;
    left: 20.25rem;
    width: 25rem;
    height: 5.5rem
}
.__01-Home_sectionContainer__nzBwa {
    position: relative;
    width: 100%;
    height: 100vh;
    box-sizing: border-box;
    overflow: hidden
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa {
        height:calc(100vh - var(--vh-offset) - 9.625rem)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
    position: absolute;
    filter: drop-shadow(0 0 .75rem rgba(0,0,0,.4))
}

@media(orientation: landscape) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        right:1.25rem;
        top: calc(50% - 16.5rem);
        height: 37.28rem;
        width: auto
    }
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        top:calc(50% - 6rem);
        right: 0;
        height: 21.4rem;
        width: auto;
        transform: translateX(4%)
    }
}

@media(orientation: landscape) {
    html[lang=de-de] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.04rem
    }
}

@media(orientation: portrait) {
    html[lang=de-de] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.40896rem
    }
}

@media(orientation: landscape) {
    html[lang=pt-br] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.64rem
    }
}

@media(orientation: portrait) {
    html[lang=pt-br] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.75336rem
    }
}

@media(orientation: landscape) {
    html[lang=en-us] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.8rem
    }
}

@media(orientation: portrait) {
    html[lang=en-us] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.8452rem
    }
}

@media(orientation: landscape) {
    html[lang=es-mx] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:38.92rem
    }
}

@media(orientation: portrait) {
    html[lang=es-mx] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.34008rem
    }
}

@media(orientation: landscape) {
    html[lang=fr-fr] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.84rem
    }
}

@media(orientation: portrait) {
    html[lang=fr-fr] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.86816rem
    }
}

@media(orientation: landscape) {
    html[lang=id-id] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.64rem
    }
}

@media(orientation: portrait) {
    html[lang=id-id] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.75336rem
    }
}

@media(orientation: landscape) {
    html[lang=it-it] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:39.64rem
    }
}

@media(orientation: portrait) {
    html[lang=it-it] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.75336rem
    }
}

@media(orientation: landscape) {
    html[lang=ja-jp] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:37.3333333333rem
    }
}

@media(orientation: portrait) {
    html[lang=ja-jp] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:21.4293333333rem
    }
}

@media(orientation: landscape) {
    html[lang=ko-kr] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:38.28rem
    }
}

@media(orientation: portrait) {
    html[lang=ko-kr] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:21.97272rem
    }
}

@media(orientation: landscape) {
    html[lang=zh-tw] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:37.28rem
    }
}

@media(orientation: portrait) {
    html[lang=zh-tw] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:21.39872rem
    }
}

@media(orientation: landscape) {
    html[lang=ru-ru] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:38.64rem
    }
}

@media(orientation: portrait) {
    html[lang=ru-ru] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:22.17936rem
    }
}

@media(orientation: landscape) {
    html[lang=vi-vn] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:41.36rem
    }
}

@media(orientation: portrait) {
    html[lang=vi-vn] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:23.74064rem
    }
}

@media(orientation: landscape) {
    html[lang=th-th] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:43.28rem
    }
}

@media(orientation: portrait) {
    html[lang=th-th] .__01-Home_sectionContainer__nzBwa .__01-Home_pageTitle__vrFKR {
        height:24.84272rem;
        top: calc(50% - 8rem)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_bg__v8bpf {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/kv-2.9326351a.jpg);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: 50%;
    will-change: transform
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_bg__v8bpf {
        background-image:url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/kv-h5-3.85639583.jpg)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_bg__v8bpf:before {
    content: "";
    position: absolute;
    bottom: 0;
    height: 39rem;
    width: 100%;
    background-image: linear-gradient(180deg,transparent 0,black);
    opacity: .3
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_bg__v8bpf:before {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl {
    position: absolute;
    bottom: 5.3125rem;
    left: 9.8125rem;
    display: flex;
    align-items: center;
    gap: 3.25rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl {
        bottom:19.9375rem;
        left: 50%;
        transform: translateX(-50%);
        flex-direction: column;
        gap: 1.75rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl:before {
    content: "";
    position: absolute;
    left: -9.75rem;
    width: calc(100% + 40.3125rem);
    height: 7.8125rem;
    background-image: linear-gradient(-45deg,transparent,transparent 18.3707517568%,black 0,black 31.6292482432%,transparent 0,transparent 68.3707517568%,black 0,black 81.6292482432%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    background-size: .75rem .75rem;
    opacity: .2;
    -webkit-mask-image: linear-gradient(90deg,transparent 0,black 9.75rem,black calc(100% - 30rem),transparent);
    mask-image: linear-gradient(90deg,transparent 0,black 9.75rem,black calc(100% - 30rem),transparent)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl:before {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_decoIcon__7aj2e {
    position: absolute;
    left: 0;
    top: -2.4375rem;
    width: 11rem;
    height: auto;
    color: #f2f2f2
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_decoIcon__7aj2e {
        display:none;
        top: -3.25rem;
        filter: drop-shadow(0 0 .75rem rgba(0,0,0,.4))
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h {
    position: relative;
    min-width: 26.625rem;
    height: 6.625rem;
    padding-left: 8.25rem;
    padding-right: 1rem;
    box-sizing: border-box;
    border-radius: .25rem;
    border-left: .75rem solid #fff500;
    background-color: #fffa00;
    box-shadow: 0 0 .75rem rgba(0,0,0,.4);
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/button-texture.aac73492.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    background-position: 100%;
    cursor: pointer;
    color: #191919;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color .2s ease,background-color .2s ease
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h:hover {
        border-color:#efe701
    }

    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h:hover .__01-Home_divider__R2lS3 {
        background-color: #efe701
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h:active {
    border-color: #e6de01
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h:active .__01-Home_divider__R2lS3 {
    background-color: #e6de01
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb {
    border-left: .75rem solid #ccc;
    background-color: #f2f2f2
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb .__01-Home_divider__R2lS3 {
    background-color: #d9d9d9
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb.__01-Home_disabled__AdSah {
    cursor: not-allowed;
    pointer-events: none;
    background-color: #aaa;
    color: #888
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb.__01-Home_disabled__AdSah .__01-Home_text__MqVIb .__01-Home_arrow__AV90H {
    display: none
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb:hover {
        border-color:#aaa
    }

    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb:hover .__01-Home_divider__R2lS3 {
        background-color: #aaa
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb:active {
    border-color: #999
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h.__01-Home_button2__c33lb:active .__01-Home_divider__R2lS3 {
    background-color: #999
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h {
        min-width:32.5rem;
        width: 100%;
        height: 7.75rem;
        padding-left: 11rem;
        padding-right: 2rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_points__TPKhJ {
    position: absolute;
    top: .4375rem;
    left: .5625rem;
    width: 1.1875rem;
    height: auto;
    color: #7e7e7e
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_points__TPKhJ {
        top:.625rem;
        left: 1.125rem;
        width: 1.3125rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_icon__JVsVt {
    position: absolute;
    left: 3.5625rem;
    transform: translateX(-50%);
    width: 2.4375rem;
    height: auto
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_icon__JVsVt {
        left:4.625rem;
        width: 3.125rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_icon__JVsVt.__01-Home_icon1__0G7V4 {
    width: 2.8125rem;
    height: 2.4375rem;
    background-color: currentColor;
    -webkit-mask-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/book.b038da8e.png);
    mask-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/book.b038da8e.png);
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_divider__R2lS3 {
    position: absolute;
    left: 7.125rem;
    width: .25rem;
    height: 4.375rem;
    background-color: #fff500;
    transition: background-color .2s ease
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_divider__R2lS3 {
        left:8.9375rem;
        width: .3125rem;
        height: 5.1875rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_text__MqVIb {
    position: relative;
    font-size: 2.25rem;
    line-height: 1;
    font-family: SansMedium;
    display: flex;
    align-items: center;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_text__MqVIb {
        font-size:2.625rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_text__MqVIb .__01-Home_arrow__AV90H {
    margin-left: .75rem;
    width: .6875rem;
    height: auto;
    color: #a6a6a6;
    transform: rotate(180deg)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_buttons__nrlPl .__01-Home_button__Azr_h .__01-Home_text__MqVIb .__01-Home_arrow__AV90H {
        width:.8125rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_timer__kfURw {
    position: absolute;
    left: 9.75rem;
    bottom: 2.25rem;
    font-size: 1.0625rem;
    font-family: Gilroy-Medium;
    color: #ccc;
    text-transform: uppercase;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_timer__kfURw {
        display:none;
        left: 50%;
        bottom: 22.4375rem;
        transform: translateX(-50%);
        font-size: 1.0625rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_decoLine__m3fUe {
    position: absolute;
    left: 0;
    bottom: 17.875rem;
    height: 3px;
    width: 100%;
    background-image: linear-gradient(90deg,rgba(255,255,255,.5) 0,rgba(255,255,255,.5) 30%,rgba(255,255,255,0) 70%)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_decoLine__m3fUe {
        display:none;
        bottom: 50.3125rem;
        left: 0;
        height: .3125rem;
        background-image: linear-gradient(90deg,rgba(255,255,255,.5) 0,rgba(255,255,255,.5) 60%,rgba(255,255,255,0) 90%)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_decoLine__m3fUe .__01-Home_bar__rr781 {
    position: absolute;
    left: 9.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 12.5rem;
    height: 6px;
    background-color: #fffa00
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_decoLine__m3fUe .__01-Home_bar__rr781 {
        left:calc(50% - 16.25rem);
        width: 9.5625rem;
        height: .3125rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh {
    position: absolute;
    right: 18.75rem;
    bottom: 4.0625rem;
    width: 26.5rem;
    height: 12.5rem;
    box-sizing: border-box;
    border-radius: .25rem;
    background-color: rgba(0,0,0,.5);
    border-left: .9375rem solid rgba(0,0,0,.5)
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh.__01-Home_preReg__cQ0pT {
    width: max-content!important
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh.__01-Home_preReg__cQ0pT {
        left:50%!important;
        transform: translateX(-50%)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh.__01-Home_preReg__cQ0pT .__01-Home_decoRt__ChjJz {
    left: unset;
    right: 1.125rem
}

@media(orientation: landscape) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh.__01-Home_oversea__Mxf2g {
        right:3.0625rem;
        bottom: 4.0625rem;
        width: 28.5rem
    }
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh.__01-Home_oversea__Mxf2g {
        left:calc(50% - 19.375rem)
    }

    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh {
        left: calc(50% - 23.375rem);
        bottom: 8.5rem;
        right: unset;
        width: 28.5rem;
        height: 8.125rem;
        border-left: .75rem solid rgba(0,0,0,.5)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoText__j5f_6 {
    position: absolute;
    width: 4.8125rem;
    height: auto;
    left: .9375rem;
    bottom: 1rem;
    color: #7e7e7e
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoText__j5f_6 {
        left:1rem;
        bottom: 1rem;
        color: #b8b8b8
    }

    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoText__j5f_6 {
        width: 4rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRt__ChjJz {
    position: absolute;
    width: 2rem;
    height: auto;
    top: 1.3125rem;
    right: 12.75rem;
    color: #7e7e7e
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRt__ChjJz {
        top:1.125rem;
        right: 14.8125rem;
        color: #b8b8b8
    }

    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRt__ChjJz {
        width: 1.5rem;
        right: 14rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRb___NVh2 {
    position: absolute;
    width: .5625rem;
    height: auto;
    bottom: 1rem;
    right: 12.75rem;
    color: #7e7e7e
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRb___NVh2 {
        bottom:1rem;
        right: 14.8125rem;
        color: #b8b8b8
    }

    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_decoRb___NVh2 {
        width: .4375rem;
        right: 14rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_iconContainer__SzUCW {
    position: absolute;
    width: 1.6875rem;
    height: 1.6875rem;
    left: .9375rem;
    top: 1.25rem;
    border-radius: .1875rem;
    background-color: #fffa00
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_iconContainer__SzUCW {
        width:2rem;
        height: 2rem;
        left: .875rem;
        top: 1rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_iconContainer__SzUCW .__01-Home_icon__JVsVt {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%) rotate(-90deg);
    width: 1.125rem;
    height: auto;
    color: #191919
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_iconContainer__SzUCW .__01-Home_icon__JVsVt {
        width:1.25rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_text__MqVIb {
    position: absolute;
    top: 1.0625rem;
    left: 3.25rem;
    font-size: 1.5rem;
    line-height: 2.25rem;
    height: 2.25rem;
    font-family: SansMedium;
    color: #fff;
    border-left: 2px solid #4d4d4d;
    padding-left: .625rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_text__MqVIb {
        top:1.0625rem;
        left: 3.5rem;
        font-size: 1.875rem;
        height: 1.875rem;
        line-height: 1;
        padding-left: .4375rem;
        border-left: 1px solid #999
    }

    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_text__MqVIb {
        top: 1rem;
        font-size: 1.5rem;
        padding-top: .3125rem;
        height: 2rem;
        box-sizing: border-box
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 {
    position: absolute;
    top: .625rem;
    right: .625rem;
    width: 11.25rem;
    height: 11.25rem;
    box-sizing: border-box;
    border-radius: 2px;
    background-color: hsla(0,0%,100%,.1);
    display: flex;
    flex-wrap: wrap;
    gap: .875rem;
    padding: .6875rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 {
        top:.875rem;
        right: .875rem;
        width: max-content;
        height: 6.3125rem;
        flex-wrap: nowrap;
        align-items: center;
        gap: 0
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_divider__R2lS3 {
    position: relative;
    width: 1px;
    height: 1.875rem;
    background-color: #707070;
    margin: 0 .625rem
}

@media(orientation: landscape) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_divider__R2lS3 {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3 {
    width: 4.5rem;
    height: 4.5rem;
    margin-top: auto;
    margin-bottom: auto;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    transition: filter .2s ease;
    cursor: pointer
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3:hover {
        filter:brightness(1.1)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3:active {
    filter: brightness(.95)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3 {
        width:4.875rem;
        height: 4.875rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_ios__KTvzl {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ios.76da33c2.png)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_ios__KTvzl {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_android__9lBEv {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/android.ea786e31.png)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_android__9lBEv {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_mumu__Jm_v6 {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/mumu.0baa6a5b.png)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_mumu__Jm_v6 {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_h5__3RT__ {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/h5-shop.d21a703c.png)
}

@media(orientation: landscape) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_h5__3RT__ {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_platforms___EOK6 .__01-Home_platform__NwLo3.__01-Home_tap__ElvOm {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/tap.f1d114eb.png)
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regs__Fwjvs {
    position: relative;
    padding-left: .9375rem;
    padding-right: 1.125rem;
    padding-top: 3.9375rem;
    width: max-content;
    display: flex;
    gap: .3125rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regs__Fwjvs {
        flex-direction:row-reverse
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regGroup2__uD9PR,.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regGroup__FTWpL {
    position: relative;
    display: flex;
    gap: .3125rem;
    flex-direction: column
}

@media(orientation: portrait) {
    html[lang=ko-kr] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regGroup2__uD9PR {
        order:2
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn {
    position: relative;
    width: auto;
    height: 3.375rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn:hover {
        filter:brightness(1.2)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn:active {
    filter: brightness(.95)
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn.__01-Home_frame__346BT {
    width: 11.5625rem;
    background-color: #000;
    border-radius: .375rem;
    border: 1px solid #8f8f8f;
    box-sizing: border-box
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn.__01-Home_frame__346BT.__01-Home_epic__p675F,.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn.__01-Home_frame__346BT.__01-Home_ps__ttoO3 {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_epic__p675F {
    width: 6.3125rem;
    height: auto
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_ps__ttoO3 {
    width: 6.75rem;
    height: auto
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_galaxyStore__kCodr {
    width: auto;
    height: 2rem
}

.__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_appStore__QoWxm {
    width: auto;
    height: 3.375rem
}

html[lang=zh-tw] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_appStore__QoWxm {
    height: 4rem
}

html[lang=es-mx] .__01-Home_sectionContainer__nzBwa .__01-Home_downloadContainer__u_Vdh .__01-Home_regPlatform__bmsKn img.__01-Home_appStore__QoWxm {
    height: 3.25rem
}

.__01-Home_sectionContainer__nzBwa .__01-Home_rankImage__iGX4V {
    position: absolute;
    bottom: 4.0625rem;
    right: 31.5625rem;
    width: auto;
    height: 7.5rem;
    opacity: 0
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_rankImage__iGX4V {
        top:1.875rem;
        right: 1.5625rem;
        height: 7.5rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc {
    position: absolute;
    right: 3.0625rem;
    bottom: 4.0625rem;
    width: 14.375rem;
    box-sizing: border-box;
    padding: .625rem;
    border-radius: .25rem;
    background-color: rgba(0,0,0,.5);
    display: flex;
    flex-direction: column;
    gap: .625rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc {
        left:50%;
        transform: translateX(-50%);
        bottom: 8.5rem;
        width: max-content;
        height: 8.125rem;
        flex-direction: row-reverse;
        background-color: rgba(0,0,0,0);
        gap: .6875rem;
        padding: 0
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc {
        display:none
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc {
        right:calc(50% - 19.375rem)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h {
    position: relative;
    border-radius: .125rem;
    flex: 1 1;
    width: 100%;
    background-color: hsla(0,0%,100%,.1);
    transition: background-color .2s ease;
    color: #fff;
    cursor: pointer
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h:hover {
        background-color:hsla(0,0%,100%,.15)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h:active {
    background-color: hsla(0,0%,100%,.2)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h {
        width:8.125rem;
        height: 8.125rem;
        flex: unset;
        border-radius: .25rem;
        background-color: rgba(0,0,0,.5)
    }

    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h:before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 6.25rem;
        height: 6.25rem;
        transform: translate3d(-50%,-50%,0);
        border-radius: .125rem;
        background-color: hsla(0,0%,100%,.1)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_iconCharge__JPAwY {
    position: absolute;
    left: 2.4375rem;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 2.75rem;
    height: auto;
    filter: drop-shadow(0 0 .5rem rgba(0,0,0,.75))
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_iconCharge__JPAwY {
        left:50%;
        top: 50%;
        transform: translate3d(-50%,-50%,0);
        width: 4.6875rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_iconSkland__UP_OS {
    position: absolute;
    left: 2.4375rem;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 2.6875rem;
    height: 2.6875rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/skland.46bc0df3.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_iconSkland__UP_OS {
        left:50%;
        top: 50%;
        transform: translate3d(-50%,-50%,0);
        width: 5rem;
        height: 5rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_text__MqVIb {
    position: relative;
    padding-left: 4.375rem;
    font-size: 1.375rem;
    line-height: 5.25rem;
    font-family: SansRegular;
    text-align: center
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_extraContainer__ZDkvc .__01-Home_button__Azr_h .__01-Home_text__MqVIb {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_age__GA8_S {
    position: absolute;
    right: 19.0625rem;
    bottom: 4.0625rem;
    width: 4rem;
    height: 5.125rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    cursor: pointer;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/age.6871a633.png)
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_age__GA8_S {
        top:1.875rem;
        right: 1.5625rem;
        width: 6.25rem;
        height: 7.8125rem
    }
}

@keyframes __01-Home_activityBreath__e_bFe {
    0% {
        background-color: rgba(0,0,0,.5)
    }

    50% {
        background-color: rgba(85,85,85,.5)
    }

    to {
        background-color: rgba(0,0,0,.5)
    }
}

@keyframes __01-Home_activityShake__piREg {
    0% {
        transform: translateZ(0)
    }

    5% {
        transform: translate3d(-.25rem,-.125rem,0)
    }

    10% {
        transform: translate3d(.25rem,.125rem,0)
    }

    15% {
        transform: translate3d(-.125rem,-.125rem,0)
    }

    20% {
        transform: translate3d(.125rem,.125rem,0)
    }

    25% {
        transform: translateZ(0)
    }

    to {
        transform: translateZ(0)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF {
    position: absolute;
    right: 3.0625rem;
    bottom: 18.8125rem;
    width: 14.375rem;
    height: 14.375rem;
    border-radius: .25rem;
    background-color: rgba(0,0,0,.5);
    padding-top: 10rem;
    padding-left: .625rem;
    padding-right: .625rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: #fff;
    line-height: 1.125;
    animation: __01-Home_activityBreath__e_bFe 2s ease-in-out infinite;
    cursor: pointer
}

html[lang=fr-fr] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF,html[lang=ja-jp] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF {
    font-size: 1.25rem
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF {
        display:none
    }
}

@media(any-hover: hover) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF:hover {
        animation-play-state:paused;
        filter: brightness(1.05)
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF:before {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/activity-pc.73579170.jpg)
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF:after,.__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    margin: .625rem;
    display: block;
    width: 13.125rem;
    height: 9.5625rem;
    background-repeat: no-repeat;
    background-size: cover;
    border-radius: .25rem;
    background-position: 50%
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF:after {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/activity-f-pc.3d5887eb.png);
    animation: __01-Home_activityShake__piREg 2s cubic-bezier(.36,.07,.19,.97) infinite
}

html[data-oversea=true] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButton__Ka_YF {
    bottom: 4.0625rem
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my {
    position: absolute;
    right: 3.4375rem;
    top: 5.625rem;
    bottom: unset;
    font-size: .875rem;
    display: flex;
    width: 13.25rem;
    height: 10.875rem;
    border-radius: .25rem;
    overflow: hidden;
    background-image: linear-gradient(90deg,rgba(0,0,0,.6) 0,rgba(0,0,0,.6) 30%,white 70%)
}

html[lang=zh-cn] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my {
    top: 11rem;
    right: 1.5625rem
}

@media(orientation: landscape) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my {
        display:none
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my:before {
    content: ">> -\\\\ Endfield >  X:|Users >>";
    position: absolute;
    left: .15em;
    bottom: calc(100% - .625em);
    font-family: Gilroy-Medium;
    font-size: 1.375em;
    transform-origin: left bottom;
    transform: rotate(90deg) scale(.5);
    color: #888;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my:before {
        color:#fff
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my .__01-Home_inner__k3xho {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 12rem;
    height: 10.1875rem;
    background-color: #fff;
    border-radius: .25rem 0 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding-bottom: 6.25rem;
    padding-left: .25rem;
    padding-right: .25rem;
    font-family: SansMedium;
    font-size: 1.5625em;
    line-height: 1.25
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my .__01-Home_inner__k3xho:before {
    content: "";
    position: absolute;
    left: .5rem;
    bottom: .5rem;
    width: 11.125rem;
    height: 6.4375rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/activity-h5.114a8159.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my .__01-Home_inner__k3xho:after {
    content: "";
    position: absolute;
    left: .5rem;
    bottom: .5rem;
    width: 11.125rem;
    height: 6.4375rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/activity-f-h5.24c296d2.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    animation: __01-Home_activityShake__piREg 2s cubic-bezier(.36,.07,.19,.97) infinite
}

@media(orientation: portrait) {
    html[lang=fr-fr] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my .__01-Home_inner__k3xho,html[lang=ja-jp] .__01-Home_sectionContainer__nzBwa .__01-Home_activityButtonH5__R85my .__01-Home_inner__k3xho {
        font-size:1.25rem
    }
}

.__01-Home_sectionContainer__nzBwa .__01-Home_animationElement__b8WSv {
    opacity: 0
}

.__01-Home_scrollTip__Z6wM0 {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 2.75rem;
    width: 5.9375rem;
    height: 4.625rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/scroll_tip.351d44bc.png);
    background-size: contain;
    background-position: 50%;
    background-repeat: no-repeat;
    animation: __01-Home_scrollTipMove__Rmj8S 1.6s infinite;
    display: none
}

@keyframes __01-Home_scrollTipMove__Rmj8S {
    0% {
        transform: translateX(-50%) translateY(0);
        opacity: 0
    }

    60% {
        opacity: 1
    }

    80% {
        transform: translateX(-50%) translateY(1.5rem);
        opacity: 0
    }

    to {
        transform: translateX(-50%) translateY(0);
        opacity: 0
    }
}

@media(orientation: portrait) {
    .__01-Home_scrollTip__Z6wM0 {
        display:block
    }
}

.RollingContent_rollingContent__VbFgT,.RollingContent_rollingContent__VbFgT .RollingContent_overflowWrapper__7cCR9 {
    position: relative;
    width: 100%;
    height: 100%
}

.RollingContent_rollingContent__VbFgT .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx {
    position: absolute;
    min-width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    left: 0;
    transform: translateX(0)
}

.RollingContent_rollingContent__VbFgT.RollingContent_rolling__WOKrN .RollingContent_overflowWrapper__7cCR9 {
    overflow: hidden
}

.RollingContent_rollingContent__VbFgT.RollingContent_new__6avsT .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx .RollingContent_realContent__voMS6:before,.RollingContent_rollingContent__VbFgT.RollingContent_new__6avsT.RollingContent_rolling__WOKrN:before {
    opacity: 1
}

.RollingContent_rollingContent__VbFgT.RollingContent_new__6avsT.RollingContent_rolling__WOKrN .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx .RollingContent_realContent__voMS6:before {
    opacity: 0
}

@keyframes RollingContent_carousel__Yi3KP {
    0% {
        transform: translateX(0)
    }

    80% {
        transform: translateX(-50%)
    }

    to {
        transform: translateX(-50%)
    }
}

.RollingContent_carouselContent__BsTCo,.RollingContent_carouselContent__BsTCo .RollingContent_overflowWrapper__7cCR9 {
    position: relative;
    width: 100%;
    height: 100%
}

.RollingContent_carouselContent__BsTCo .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx {
    position: absolute;
    min-width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    animation-name: RollingContent_carousel__Yi3KP;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    animation-play-state: paused;
    animation-direction: normal
}

.RollingContent_carouselContent__BsTCo .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx .RollingContent_realContent__voMS6 {
    position: relative
}

.RollingContent_carouselContent__BsTCo .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx .RollingContent_repeat__YLp8f {
    display: none
}

.RollingContent_carouselContent__BsTCo.RollingContent_rolling__WOKrN .RollingContent_overflowWrapper__7cCR9 {
    overflow: hidden
}

.RollingContent_carouselContent__BsTCo.RollingContent_rolling__WOKrN .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx {
    animation-play-state: running
}

.RollingContent_carouselContent__BsTCo.RollingContent_rolling__WOKrN .RollingContent_overflowWrapper__7cCR9 .RollingContent_contentContainer__U3urx .RollingContent_repeat__YLp8f {
    display: block;
    margin: 0 .3rem
}

.TransparentVideo_container__Inu2a {
    position: relative
}

.TransparentVideo_container__Inu2a canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center
}

.TransparentVideo_container__Inu2a .TransparentVideo_overlay__oi9EU {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform: translateX(5rem)
}
.__20-NoticeDetail_sectionContainer__06Hmx {
    position: relative;
    min-height: 100vh
}

.__20-NoticeDetail_sectionContainer__06Hmx:before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 39.25rem;
    height: 23.375rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: 100% 0;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-deco-rt.6fce5d04.png)
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx:before {
        display:none
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 43.0625rem;
    height: 43.125rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: 0 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-deco-lb.b881dcb3.png)
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx:after {
        display:none
    }

    .__20-NoticeDetail_sectionContainer__06Hmx {
        min-height: calc(200vh - 9.625rem)
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr {
    position: relative
}

@media(orientation: landscape) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr {
        padding-top:13.75rem;
        padding-left: calc(50% - 80rem + 3.75rem + 20.4375rem);
        padding-bottom: 13.75rem;
        width: 97.75rem
    }
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr {
        padding:7.5rem 9.75rem 13rem
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S {
    position: relative;
    margin-top: 2rem;
    display: flex;
    align-items: center
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S {
        margin-top:0
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S .__20-NoticeDetail_type__fRshy {
    height: 2rem;
    font-size: 1.5rem;
    line-height: 2rem;
    box-sizing: border-box;
    padding: .07em 2.25rem 0;
    background-color: #e6e6e6;
    color: gray;
    font-family: SansMedium
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S .__20-NoticeDetail_type__fRshy {
        height:3rem;
        font-size: 2.25rem;
        line-height: 3rem;
        font-family: SansRegular;
        padding: .07em 2rem 0;
        color: gray;
        background-color: #f2f2f2
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S .__20-NoticeDetail_date__A4MY4 {
    position: relative;
    margin-left: 2rem;
    font-size: 1.5rem;
    line-height: 2rem;
    top: .07em;
    font-family: SansRegular;
    color: gray
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_subtitle__Eu01S .__20-NoticeDetail_date__A4MY4 {
        margin-left:2rem;
        font-size: 2.25rem;
        line-height: 3rem;
        color: gray
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 {
    position: relative;
    margin-top: 1rem;
    font-size: 3rem;
    min-height: 7.75rem
}

@media(orientation: landscape) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 {
        padding-right:5.5rem
    }
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 {
        margin-top:1.25rem;
        font-size: 3rem;
        min-height: 7rem;
        line-height: 4.375rem;
        font-weight: 500
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 .__20-NoticeDetail_close__SEu18 {
    position: absolute;
    height: auto;
    color: #191919;
    cursor: pointer;
    transition: transform .2s ease
}

@media(any-hover: hover) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 .__20-NoticeDetail_close__SEu18:hover {
        transform:rotate(90deg)
    }
}

@media(orientation: landscape) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 .__20-NoticeDetail_close__SEu18 {
        right:.75rem;
        top: 0;
        width: 4rem
    }
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_title__cALu9 .__20-NoticeDetail_close__SEu18 {
        left:100%;
        top: -8rem;
        width: 3.375rem
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_divider__Kqd1D {
    margin-top: 1rem;
    height: .1875rem;
    background-color: #d9d9d9
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_divider__Kqd1D {
        margin-top:0
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_content__wIAEN {
    margin-top: 1rem;
    font-size: 1.625rem
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_content__wIAEN img {
    max-width: 100%;
    height: auto
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_contentContainer__irljr .__20-NoticeDetail_content__wIAEN img:not(:first-child) {
    margin-top: .5rem
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_bgBottom__LVKra {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 37.5rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/points-bg.f3b559e8.png);
    background-size: 1.5em 1.5em;
    background-position: bottom;
    -webkit-mask-image: linear-gradient(180deg,transparent 0,transparent 50%,black 90%,black);
    mask-image: linear-gradient(180deg,transparent 0,transparent 50%,black 90%,black);
    opacity: .08
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_bgBottom__LVKra {
        height:37.5rem
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_decoLB__WRrlN {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 20.4375rem + .75rem);
    bottom: 6.5625rem;
    width: 6.4375rem;
    height: auto;
    color: #b3b3b3;
    filter: drop-shadow(0 0 .25rem #ffffff) drop-shadow(0 0 .5rem #ffffff) drop-shadow(0 0 .5rem #ffffff)
}

@media(orientation: portrait) {
    .__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_decoLB__WRrlN {
        left:9.75rem;
        bottom: 8.3125rem
    }
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_backButton__pWmC1 {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background-color: #f1f1f1;
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_backButton__pWmC1.__20-NoticeDetail_active__mKxUQ {
    opacity: 1;
    pointer-events: auto
}

.__20-NoticeDetail_sectionContainer__06Hmx .__20-NoticeDetail_backButton__pWmC1 .__20-NoticeDetail_icon___g46M {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 3rem;
    height: 3rem;
    color: #b3b3b3
}

.Button_button__njqVS {
    position: relative;
    width: 20rem;
    height: 4.5rem;
    box-sizing: border-box;
    border: none;
    border-radius: 2px;
    padding: 0;
    cursor: pointer;
    background-color: #383838;
    background-blend-mode: soft-light;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    line-height: 1;
    font-family: SansMedium;
    color: #eee;
    transition: color .2s ease,background-color .2s ease,border-radius .2s ease;
    filter: drop-shadow(0 0 .25rem rgba(0,0,0,.25))
}

@media(orientation: portrait) {
    .Button_button__njqVS {
        border-radius:.25rem;
        box-shadow: 0 0 .75rem rgba(0,0,0,.25)
    }
}

.Button_button__njqVS span.Button_text__FSrIs {
    padding-top: .245rem
}

.Button_button__njqVS:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    border-radius: 2px;
    transition: border-radius .2s ease;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/button-texture.63d91da2.png)
}

.Button_button__njqVS:after {
    content: "";
    position: absolute;
    left: .5rem;
    width: 1rem;
    height: 55%;
    background-color: #fffa00;
    -webkit-clip-path: polygon(0 0,25% 0,25% 100%,0 100%);
    clip-path: polygon(0 0,25% 0,25% 100%,0 100%);
    transition: transform .2s ease,-webkit-clip-path .2s ease;
    transition: clip-path .2s ease,transform .2s ease;
    transition: clip-path .2s ease,transform .2s ease,-webkit-clip-path .2s ease
}

@media(orientation: portrait) {
    .Button_button__njqVS:after {
        left:1rem;
        width: 1.25rem
    }
}

.Button_button__njqVS.Button_disabled__FGmkD {
    cursor: not-allowed;
    pointer-events: none;
    background-color: #888;
    color: #666
}

.Button_button__njqVS.Button_disabled__FGmkD:after {
    background-color: #666
}

.Button_button__njqVS.Button_light__kRD_6 {
    background-color: #fff;
    color: #000
}

.Button_button__njqVS.Button_light__kRD_6:before {
    filter: invert(1)
}

.Button_button__njqVS.Button_light__kRD_6:after {
    background-color: #888
}

@media(any-hover: hover) {
    .Button_button__njqVS.Button_light__kRD_6:hover {
        color:#000;
        background-color: #f0f0f0;
        border-radius: 6px
    }

    .Button_button__njqVS:hover {
        color: #fff;
        background-color: #484848;
        border-radius: 6px
    }

    .Button_button__njqVS:hover:before {
        border-radius: 6px
    }

    .Button_button__njqVS:hover:after {
        -webkit-clip-path: polygon(0 20%,100% 50%,0 80%,0 80%);
        clip-path: polygon(0 20%,100% 50%,0 80%,0 80%);
        transform: translateX(.875rem)
    }
}

.Media_mediaModal__4NhcG {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease-in-out
}

.Media_mediaModal__4NhcG.Media_active__t0_Nv {
    opacity: 1;
    pointer-events: auto
}

.Media_mediaModal__4NhcG .Media_modalContainer__IJFBx {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0)
}

.Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_mediaVideo__pYTuU {
    display: block;
    width: 125rem;
    height: 70.3125rem;
    object-fit: contain;
    object-position: center
}

@media(orientation: portrait) {
    .Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_mediaVideo__pYTuU {
        width:64rem;
        height: 35.5rem
    }
}

.Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_mediaIframe__pbm15 {
    display: block;
    width: 125rem;
    height: 70.3125rem
}

@media(orientation: portrait) {
    .Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_mediaIframe__pbm15 {
        width:64rem;
        height: 35.5rem
    }
}

.Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_closeBtn__PlFHw {
    position: absolute;
    width: 4rem;
    height: 4rem;
    cursor: pointer;
    background-color: #fffa00;
    display: flex;
    align-items: center;
    justify-content: center
}

@media(orientation: landscape) {
    .Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_closeBtn__PlFHw {
        top:0;
        left: 100%
    }
}

@media(orientation: portrait) {
    .Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_closeBtn__PlFHw {
        bottom:100%;
        right: 0
    }
}

@media(any-hover: hover) {
    .Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_closeBtn__PlFHw:hover .Media_closeIcon__4PSl6 {
        transform:rotate(90deg)
    }
}

.Media_mediaModal__4NhcG .Media_modalContainer__IJFBx .Media_closeBtn__PlFHw .Media_closeIcon__4PSl6 {
    width: 3rem;
    height: 3rem;
    color: #191919;
    transition: transform .3s
}

.ModalFrame_modalFrame__WKkW2 {
    position: relative;
    width: 109rem;
    font-size: 1rem;
    background-color: #fafafa
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 {
        width:60.5rem
    }
}

.ModalFrame_modalFrame__WKkW2:before {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/points-bg.f3b559e8.png);
    background-size: 1.5em 1.5em;
    background-position: bottom;
    -webkit-mask-image: linear-gradient(180deg,transparent 0,transparent 50%,black 90%,black);
    mask-image: linear-gradient(180deg,transparent 0,transparent 50%,black 90%,black);
    opacity: .08
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_header__GAf1j {
    position: relative;
    height: 8.75rem;
    background-color: #1f1f1f;
    overflow: hidden
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_header__GAf1j {
        height:10.75rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_header__GAf1j:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,black 0,black 36.0487470721%,transparent 0,transparent 63.9512529279%,black 0,black 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_header__GAf1j:before {
        background-size:.75rem .75rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_decoText__R_poJ {
    position: absolute;
    left: 50%;
    top: 2.6875em;
    width: 50rem;
    height: auto;
    color: #2e2e2e;
    transform: translate3d(-50%,0,0)
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_decoText__R_poJ {
        width:43rem;
        top: 5.375rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_title__Ozpn7 {
    position: absolute;
    left: 50%;
    top: .5625em;
    font-size: 3.75em;
    line-height: 1;
    color: #fff;
    transform: translate3d(-50%,0,0);
    font-family: SansRegular;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_title__Ozpn7 {
        top:2.625rem;
        font-size: 4.5rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_points__61vno {
    position: absolute;
    left: 50%;
    bottom: 1.375em;
    width: 5.6875em;
    height: auto;
    color: #fff;
    transform: translate3d(-50%,0,0);
    opacity: .5
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_points__61vno {
        width:6.5rem;
        bottom: 1.875rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_close__cgZq9 {
    position: absolute;
    right: 2.125em;
    top: 50%;
    transform: translate3d(0,-50%,0);
    width: 2.625em;
    height: auto;
    color: #fff;
    cursor: pointer;
    transition: transform .2s ease-in-out,color .2s ease-in-out
}

@media(any-hover: hover) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_close__cgZq9:hover {
        transform:translate3d(0,-50%,0) rotate(90deg)
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_close__cgZq9:active {
    color: #ccc
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_close__cgZq9 {
        right:3.125rem;
        width: 3.4375rem
    }
}

.ModalFrame_modalFrame__WKkW2 .ModalFrame_decoLB__sfQIb {
    position: absolute;
    left: 2.5em;
    bottom: 2.125em;
    width: 6.4375em;
    height: auto;
    color: #b3b3b3;
    filter: drop-shadow(0 0 .25rem #ffffff) drop-shadow(0 0 .5rem #ffffff) drop-shadow(0 0 .5rem #ffffff)
}

@media(orientation: portrait) {
    .ModalFrame_modalFrame__WKkW2 .ModalFrame_decoLB__sfQIb {
        left:3.125rem;
        bottom: 2.375rem
    }
}

.ReserveModal_reserveModal__xb3np {
    position: fixed;
    z-index: 90;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease-in-out
}

.ReserveModal_reserveModal__xb3np.ReserveModal_active__L5i1J {
    opacity: 1;
    pointer-events: auto
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 {
        width:54.375rem
    }
}

.ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_label__KbnpO {
    font-size: 1.75rem
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_label__KbnpO {
        font-size:2.375rem;
        margin-top: 4rem
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z {
        margin-left: 0
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_number__5qi_C {
        font-size: 2.25rem
    }
}

@media(orientation: landscape) {
    html[lang=ja-jp] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_text__RQ_oF {
        font-size:1.375rem
    }
}

@media(orientation: portrait) {
    html[lang=ja-jp] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_text__RQ_oF {
        font-size:1.625rem
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_text__RQ_oF {
        font-size: 2rem
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
        margin-left: 0;
        margin-top: 2rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 1rem 2rem
    }
}

@media(orientation: landscape) {
    html[lang=vi-vn] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
        width:66rem
    }

    html[lang=es-mx] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb,html[lang=id-id] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb,html[lang=pt-br] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb,html[lang=th-th] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
        width: 70rem
    }

    html[lang=it-it] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb,html[lang=ru-ru] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
        width: 74rem
    }
}

.ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 {
    min-width: 12.875rem
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 {
        min-width:20rem;
        flex: unset
    }

    html[lang=it-it] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7,html[lang=ru-ru] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 {
        min-width: 24rem
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W {
        width: 3.4375rem;
        height: 3.4375rem
    }
}

@media(orientation: landscape) {
    html[lang=ja-jp] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F,html[lang=ko-kr] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
        top:.375rem
    }
}

@media(orientation: portrait) {
    html[lang=ja-jp] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F,html[lang=ko-kr] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
        top:.5rem
    }

    .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
        top: 1rem;
        left: 4.6875rem;
        font-size: 2rem
    }
}

@media(orientation: landscape) {
    html[lang=th-th] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
        top:.5rem
    }

    html[lang=ru-ru] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_reservedText__Vj0Fp {
        font-size: 1.75rem;
        transform: scale(.5);
        transform-origin: left top
    }

    html[lang=th-th] .ReserveModal_reserveModal__xb3np.ReserveModal_oversea__76D5K .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_reservedText__Vj0Fp {
        top: 2.5rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0)
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentFrame__tGTUR {
    position: relative;
    height: 37.5rem
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentFrame__tGTUR {
        height:52.125rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 {
    position: absolute;
    left: 50%;
    transform: translate3d(-50%,0,0)
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_label__KbnpO {
    margin-top: 3.75rem;
    font-size: 1.875rem;
    font-family: SansRegular;
    color: #888
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_label__KbnpO {
        margin-top:5.875rem;
        font-size: 2.625rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z {
    margin-top: 2.3125rem;
    margin-left: 1.25rem;
    height: 3.75rem;
    display: flex;
    color: #191919
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z {
        height:4.9375rem;
        margin-left: 0;
        margin-top: 2.5rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_number__5qi_C {
    width: 19.375rem;
    flex: 1 1;
    height: 100%;
    box-sizing: border-box;
    border-bottom: 2px solid rgba(38,38,38,.5);
    font-size: 2.25rem;
    font-family: SansMedium;
    line-height: 3.75rem;
    text-align: center
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_number__5qi_C {
        width:23.75rem;
        font-size: 3rem;
        line-height: 4.9375rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 {
    margin-left: .875rem;
    min-width: 11.5rem;
    width: max-content;
    padding: 0 .75rem;
    box-sizing: border-box;
    flex-shrink: 0;
    height: 100%;
    background-color: #e5e5e5;
    border-radius: .25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    cursor: pointer;
    transition: background-color .2s ease
}

@media(any-hover: hover) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5:hover {
        background-color:#d9d9d9
    }

    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5:hover .ReserveModal_switchButton__bvJDg .ReserveModal_switchIcon__rDoCl {
        transform: translate3d(-50%,-50%,0) rotate(180deg)
    }
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 {
        width:max-content;
        margin-left: 1.25rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5:active {
    background-color: #cecece
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_text__RQ_oF {
    padding-top: .15em;
    padding-left: .25em;
    font-size: 1.625rem;
    font-family: SansMedium;
    line-height: 1;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_text__RQ_oF {
        font-size:2.25rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_switchButton__bvJDg {
    position: relative;
    width: 2.375rem;
    height: 2.375rem;
    border-radius: 50%;
    background-color: #fafafa
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_switchButton__bvJDg {
        width:3rem;
        height: 3rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_switchButton__bvJDg .ReserveModal_switchIcon__rDoCl {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 1.375rem;
    height: auto;
    color: #999;
    transition: transform .2s ease
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_currentAccount__ecR_Z .ReserveModal_switch__T84S5 .ReserveModal_switchButton__bvJDg .ReserveModal_switchIcon__rDoCl {
        width:1.6875rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
    margin-top: 3.25rem;
    margin-left: 1.25rem;
    display: flex;
    height: 3.25rem
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb {
        margin-left:0;
        margin-top: 4.5625rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 {
    position: relative;
    min-width: 12.5rem;
    flex: 1 1
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_reserved__Nejcf .ReserveModal_ratio__V6W8W {
    cursor: not-allowed;
    background-color: #b3b3b3!important;
    border-color: #d9d9d9
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_reserved__Nejcf .ReserveModal_ratio__V6W8W:before {
    background-color: #999;
    transform: translate3d(-50%,-50%,0) scale(.66)
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_reserved__Nejcf .ReserveModal_key__5TE_F {
    transform: translateY(-.35em)
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_reserved__Nejcf .ReserveModal_key__5TE_F {
        transform:translateY(-.3em)
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_reserved__Nejcf .ReserveModal_reservedText__Vj0Fp {
    opacity: 1
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_selected__k9Ie_ .ReserveModal_ratio__V6W8W {
    background-color: #767676!important
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7.ReserveModal_selected__k9Ie_ .ReserveModal_ratio__V6W8W:before {
    background-color: #fffa00;
    transform: translate3d(-50%,-50%,0) scale(.66)
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W {
    position: relative;
    height: 3.25rem;
    width: 3.25rem;
    border-radius: 50%;
    border: 2.5px solid #fff;
    background-color: #e6e6e6;
    box-shadow: 0 0 .5rem rgba(38,38,38,.5);
    cursor: pointer;
    transition: background-color .2s ease,border-color .2s ease
}

@media(any-hover: hover) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W:hover {
        background-color:#d9d9d9
    }
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W {
        width:3.75rem;
        height: 3.75rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W:before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 2.25rem;
    height: 2.25rem;
    background-color: #fff;
    border-radius: 50%;
    transition: transform .2s ease,background-color .2s ease
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_ratio__V6W8W:before {
        width:2.5rem;
        height: 2.5rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
    position: absolute;
    top: .875rem;
    left: 4.5rem;
    font-size: 1.875rem;
    font-family: SansRegular;
    color: #191919;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_key__5TE_F {
        top:.375rem;
        left: 5.3125rem;
        font-size: 2.625rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_reservedText__Vj0Fp {
    position: absolute;
    top: 2.3125rem;
    left: 4.5rem;
    font-size: 1rem;
    font-family: SansRegular;
    color: #191919;
    opacity: 0;
    line-height: 1;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_contentContainer__PuFL0 .ReserveModal_platforms__3_Erb .ReserveModal_platform__MFmJ7 .ReserveModal_reservedText__Vj0Fp {
        top:3rem;
        left: 5.5rem;
        font-size: 1.3125rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_cong__qvYwY {
    position: absolute;
    text-align: center;
    top: 15rem;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    padding: 2rem 1.5rem;
    box-sizing: border-box;
    width: 60rem;
    font-size: 3rem;
    line-height: 1.25;
    font-family: SansRegular;
    background-color: #e5e5e5;
    color: #191919;
    display: flex;
    flex-direction: column;
    align-items: center
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_cong__qvYwY .ReserveModal_line__RbDL_ {
    text-align: center
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_cong__qvYwY {
        width:50rem;
        top: 22rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_successButton__ebAQs {
    position: absolute;
    bottom: 4.125rem;
    left: 50%;
    transform: translate3d(-50%,0,0)
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_successButton__ebAQs {
        bottom:7.125rem
    }
}

.ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_buttonContainer__0aiow {
    position: absolute;
    bottom: 4.125rem;
    left: 50%;
    transform: translate3d(-50%,0,0);
    display: flex;
    justify-content: center;
    gap: 2.5rem
}

@media(orientation: portrait) {
    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_buttonContainer__0aiow {
        bottom:6.4375rem;
        width: calc(100% - 6.25rem);
        justify-content: center;
        gap: 3.75rem
    }

    .ReserveModal_reserveModal__xb3np .ReserveModal_modalContainer__qRKaz .ReserveModal_buttonContainer__0aiow .ReserveModal_button__TeBIv {
        width: 25rem;
        height: 5.5rem
    }
}

.UserModal_userModal__DfHfK {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease-in-out
}

.UserModal_userModal__DfHfK.UserModal_active__fwvqF {
    opacity: 1;
    pointer-events: auto
}

.UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 52.5rem
}

.UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK .UserModal_contentFrame__gVx0W {
    height: 37.5rem;
    box-sizing: border-box;
    padding-bottom: 3rem;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center
}

@media(orientation: portrait) {
    .UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK .UserModal_contentFrame__gVx0W {
        height:32.125rem
    }
}

.UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK .UserModal_contentFrame__gVx0W .UserModal_label__IpsIV {
    font-size: 1.875rem;
    font-family: SansRegular;
    color: #888
}

.UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK .UserModal_contentFrame__gVx0W .UserModal_currentUser__9nVX2 {
    margin-top: 1rem;
    font-size: 3rem;
    font-family: SansMedium;
    line-height: 1;
    min-width: 35.5rem;
    width: max-content;
    background-color: #e5e5e5;
    padding: 1rem;
    text-align: center;
    margin-bottom: 1.5rem
}

.UserModal_userModal__DfHfK .UserModal_modalContainer__yLLeK .UserModal_contentFrame__gVx0W .UserModal_button__41zvw {
    margin-top: 1.5rem
}

.HallowText_hollowText__OJN57 {
    padding-right: 1rem;
    font-family: Novecentosanswide-Bold;
    background-image: linear-gradient(-45deg,transparent,transparent 20.5805011712%,black 0,black 29.4194988288%,transparent 0,transparent 70.5805011712%,black 0,black 79.4194988288%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    background-position: 0 0;
    -webkit-background-clip: text;
    background-clip: text;
    color: rgba(0,0,0,0);
    height: 15.625rem;
    font-size: 15.625rem;
    line-height: 1;
    letter-spacing: -.625rem;
    width: -moz-fit-content;
    width: fit-content;
    opacity: .6
}

.Header_pcHeaderContainer__Sy_8l {
    position: relative;
    height: 100vh;
    width: 7.5rem;
    z-index: 50;
    color: #191919;
    background-color: #fff
}

@media(orientation: portrait) {
    .Header_pcHeaderContainer__Sy_8l {
        display:none
    }
}

.Header_pcHeaderContainer__Sy_8l:before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: calc(100% + 16rem);
    height: 100%;
    background-color: #fff;
    box-shadow: 0 0 1rem rgba(0,0,0,.1);
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN:before {
    transform: translate3d(15rem,0,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_overlay__33Sha {
    width: calc(100% + 13.5rem)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_navItem__c_fLB {
    width: 22.5rem
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_navItem__c_fLB .Header_textWrapper__o9aHt {
    opacity: 1;
    transform: translate3d(0,-50%,0)
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_navItem__c_fLB:not(.Header_active__jzCyf):hover:before {
        opacity:1
    }
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserve___Dgfd {
    display: none
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameBg__2UVLH {
    transform: translate3d(1.5rem,6.25rem,0);
    border-radius: .25rem;
    width: 19.5rem
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameBg__2UVLH.Header_oversea__kRwH0 {
    transform: translate3d(1.5rem,8.25rem,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp {
    transform: translate3d(1.5rem,6.25rem,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp.Header_oversea__kRwH0 {
    transform: translate3d(1.5rem,8.25rem,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu {
    cursor: pointer;
    width: 18rem
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu:hover:before {
        opacity:1
    }
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu .Header_icon__3iDIG {
    pointer-events: none
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu .Header_textWrapper__o9aHt {
    opacity: 1;
    transform: translate3d(-50%,-50%,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT {
    width: 19.5rem;
    height: 4rem
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 {
    height: 4rem
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_tri__KNP87 {
    transform: translate3d(calc(-50% + .5rem),.125rem,0)
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT .Header_text__52fEh {
    opacity: 0
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT .Header_text2__cuV15 {
    opacity: 1
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT .Header_divider__tUYjO {
    opacity: 0
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonPreserveBg__rEZGT .Header_divider2__mVfPt {
    opacity: 1
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonShare__ml1S_ {
    opacity: 0;
    pointer-events: none
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_buttonShareBg__Tabt5 {
    width: 19.5rem
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_shareListDetailActive__2PFIU {
    opacity: 1;
    pointer-events: auto
}

.Header_pcHeaderContainer__Sy_8l.Header_detailActive__ngqkN .Header_logo__s3lE_.Header_oversea__kRwH0 {
    transform: translate3d(calc(-50% + .5rem),0,0) scale(1.5)
}

.Header_pcHeaderContainer__Sy_8l .Header_innerContainer__cW_Dv {
    position: relative;
    height: 100%
}

.Header_pcHeaderContainer__Sy_8l .Header_logo__s3lE_ {
    position: absolute;
    top: 1.5rem;
    left: 50%;
    transform: translate3d(-50%,0,0);
    width: 5.1875rem;
    height: auto;
    color: #191919;
    transition: transform .3s
}

@media(orientation: portrait) {
    .Header_pcHeaderContainer__Sy_8l .Header_logo__s3lE_ {
        position:absolute;
        top: 1.25rem;
        left: calc(50% - 30.6875rem);
        width: 6.75rem;
        height: 7.3125rem;
        transform: translateZ(0)
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_logo__s3lE_.Header_oversea__kRwH0 {
    width: 6.375rem;
    height: auto;
    transform-origin: left top;
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4.5rem;
    cursor: pointer;
    transition: transform .3s,width .3s
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB:hover .Header_icon__3iDIG {
        color:#858585
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB.Header_active__jzCyf .Header_icon__3iDIG {
    color: #191919!important
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB:before {
    content: "";
    position: absolute;
    left: 1.5rem;
    width: 19.5rem;
    height: 100%;
    background-color: #e5e5e5;
    opacity: 0;
    border-radius: .25rem;
    transition: opacity .2s;
    pointer-events: none
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG {
    position: absolute;
    left: 3.75rem;
    top: 2.25rem;
    transform: translate3d(-50%,-50%,0);
    height: auto;
    color: #d9d9d9;
    transition: color .2s,transform .3s;
    font-size: 1.5rem;
    white-space: nowrap
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=home] {
    width: 2.5rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=operator] {
    width: 2.75rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=lore] {
    width: 2.625rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=information] {
    width: 2.6875rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=gameplay] {
    width: 2.5625rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=notice] {
    width: 2.75rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=aicGameplay] {
    width: 2.5625rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_icon__3iDIG[data-key=milestone] {
    width: 3rem
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_textWrapper__o9aHt {
    position: absolute;
    width: 13.25rem;
    left: 6.9375rem;
    top: 2.25rem;
    pointer-events: none;
    font-family: SansMedium;
    font-size: 1.125rem;
    line-height: 1.25;
    opacity: 0;
    transform: translate3d(-1rem,-50%,0);
    transition: opacity .2s,transform .3s;
    color: #191919
}

.Header_pcHeaderContainer__Sy_8l .Header_navItem__c_fLB .Header_textWrapper__o9aHt.Header_small__J1EYZ {
    font-size: 1rem;
    line-height: 1.25;
    letter-spacing: -.02em
}

.Header_pcHeaderContainer__Sy_8l .Header_overlay__33Sha {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    width: calc(100% - 1rem);
    height: 5rem;
    border-left: .75rem solid #191919;
    background-color: #e6e6e6;
    opacity: 1;
    transition: transform .3s,height .3s,width .3s;
    pointer-events: none
}

.Header_pcHeaderContainer__Sy_8l .Header_overlay__33Sha.Header_active__jzCyf {
    transform: translateY(100%)
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameBg__2UVLH {
    position: absolute;
    bottom: 21.75rem;
    width: 3.75rem;
    height: 11.5625rem;
    border-radius: 1.875rem;
    transform: translate3d(1.875rem,0,0);
    background-color: #f2f2f2;
    transition: transform .3s,width .3s,height .3s,border-radius .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameBg__2UVLH.Header_ele2__0Xl_7 {
    height: 7.8125rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameBg__2UVLH.Header_ele3__4MIIp {
    height: 11.5625rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameBg__2UVLH.Header_oversea__kRwH0 {
    bottom: 23rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp {
    position: absolute;
    bottom: 21.75rem;
    width: 3.75rem;
    height: 11.5625rem;
    border-radius: 1.875rem;
    transform: translate3d(1.875rem,0,0);
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp.Header_oversea__kRwH0 {
    bottom: 23rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu {
    position: absolute;
    width: 100%;
    height: 3rem;
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 3rem;
    width: 18rem;
    border-radius: .25rem;
    background-color: #d9d9d9;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu .Header_icon__3iDIG {
    position: absolute;
    top: 1.5rem;
    left: 1.875rem;
    width: auto;
    height: 1.75rem;
    color: #7c7c7c;
    cursor: pointer;
    transition: color .2s;
    transform: translate3d(-50%,-50%,0)
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu .Header_icon__3iDIG:hover {
        color:#424242
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_button__b0gdu .Header_textWrapper__o9aHt {
    position: absolute;
    top: 1.5rem;
    left: 10.1875rem;
    opacity: 0;
    transform: translate3d(calc(-50% - 2rem),-50%,0);
    transition: opacity .2s,transform .3s;
    color: #191919;
    font-family: SansMedium;
    font-size: 1.125rem;
    line-height: 1;
    white-space: nowrap
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonFrameContainer__Uvshp .Header_divider__tUYjO {
    position: absolute;
    height: 1px;
    width: 1.25rem;
    background-color: #ccc;
    transition: transform .3s;
    transform-origin: left center
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT {
    position: absolute;
    left: 1.5rem;
    bottom: 9.5625rem;
    width: 4.5rem;
    height: 9.75rem;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    background-color: #191919;
    transition: width .3s,height .3s
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_bg___kVDv {
        opacity:1
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_tri__KNP87 {
        color: #191919
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_divider2__mVfPt,.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_divider__tUYjO {
        background-color: #191919
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_text2__cuV15,.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:hover .Header_text__52fEh {
        color: #191919
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 {
    height: 12.5rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_tri__KNP87 {
    top: 1rem;
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_divider__tUYjO {
    top: 3.25rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    top: 4.25rem;
    left: 1.125rem;
    line-height: .9;
    width: 7.5rem;
    transform-origin: left bottom;
    transform: translate3d(0,-100%,0) rotate(90deg);
    font-size: 1.125rem;
    text-align: left
}

html[lang=ko-kr] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    top: 4.75rem;
    left: 1.5rem;
    font-size: 1.625rem;
    letter-spacing: -.04em
}

html[lang=en-us] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    top: 4.5rem;
    left: 1.75rem;
    font-size: 1.25rem;
    letter-spacing: -.04em
}

html[lang=de-de] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh,html[lang=es-mx] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh,html[lang=id-id] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    left: 1.25rem;
    font-size: 1.125rem;
    letter-spacing: -.02em
}

html[lang=pt-br] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    left: 1.25rem;
    top: 4rem;
    font-size: 1.125rem;
    width: 8rem;
    letter-spacing: -.02em
}

html[lang=ru-ru] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    top: 4rem;
    left: 1.75rem;
    font-size: 1rem;
    letter-spacing: -.04em
}

html[lang=vi-vn] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    left: 1.25rem
}

html[lang=th-th] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT.Header_oversea__kRwH0 .Header_text__52fEh {
    left: 1.375rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_bg___kVDv {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fffa00;
    transition: opacity .2s;
    opacity: 0
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 16.1610023423%,black 0,black 33.8389976577%,transparent 0,transparent 66.1610023423%,black 0,black 83.8389976577%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    transform: translateZ(0);
    border-radius: 4px;
    transition: opacity .2s,background-color .2s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_text__52fEh {
    position: absolute;
    top: 5.625rem;
    left: 2.25rem;
    font-family: SansMedium;
    font-size: 1.25rem;
    width: 3.0625rem;
    text-align: center;
    line-height: 1.125;
    letter-spacing: .05em;
    color: #fff;
    transition: color .3s,opacity .2s;
    transform: translate3d(-50%,0,0);
    position: none
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_tri__KNP87 {
    position: absolute;
    top: 1.25rem;
    left: 2.25rem;
    width: 1.9375rem;
    height: 1.75rem;
    color: #fff;
    transition: color .3s;
    transform: translate3d(-50%,0,0)
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_divider__tUYjO {
    position: absolute;
    top: 4.125rem;
    left: 2.25rem;
    width: 3rem;
    height: 2px;
    background-color: hsla(0,0%,100%,.3);
    transition: background-color .3s,opacity .2s;
    transform: translate3d(-50%,0,0);
    pointer-events: none
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_divider2__mVfPt {
    position: absolute;
    left: 5.3125rem;
    bottom: 2rem;
    width: 2px;
    height: 2.75rem;
    background-color: hsla(0,0%,100%,.3);
    transition: background-color .3s,opacity .2s;
    transform: translate3d(0,50%,0);
    pointer-events: none;
    opacity: 0
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_text2__cuV15 {
    position: absolute;
    left: 12.1875rem;
    bottom: 2rem;
    white-space: nowrap;
    font-family: SansMedium;
    font-size: 1.25rem;
    line-height: 1;
    color: #fff;
    transition: color .3s,opacity .2s;
    transform: translate3d(-50%,50%,0);
    pointer-events: none;
    opacity: 0
}

html[lang=id-id] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_text2__cuV15,html[lang=pt-br] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_text2__cuV15 {
    white-space: wrap;
    width: 10rem;
    text-align: center
}

html[lang=th-th] .Header_pcHeaderContainer__Sy_8l .Header_buttonPreserveBg__rEZGT .Header_text2__cuV15 {
    font-size: 1.125rem
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShareBg__Tabt5 {
    position: absolute;
    left: 1.5rem;
    bottom: 5.5625rem;
    width: 4.5rem;
    height: 2.75rem;
    background-color: #e5e5e5;
    border-radius: 4px;
    transition: width .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU {
    position: absolute;
    left: 1.5rem;
    bottom: 5.5625rem;
    width: 19.5rem;
    height: 2.75rem;
    border-radius: 4px;
    transition: opacity .2s;
    padding: 0 1.25rem;
    box-sizing: border-box;
    opacity: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    justify-content: center
}

html[lang=en-us] .Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU,html[lang=ko-kr] .Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU,html[lang=zh-cn] .Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU {
    gap: 0;
    justify-content: space-between
}

.Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU .Header_shareItem__KBnsC {
    width: auto;
    max-width: 1.75rem;
    height: 1.75rem;
    color: #b3b3b3;
    transition: color .2s;
    cursor: pointer;
    flex-shrink: 0
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l .Header_shareListDetailActive__2PFIU .Header_shareItem__KBnsC:hover {
        color:#191919
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ {
    position: absolute;
    left: 1.5rem;
    bottom: 5.5625rem;
    width: 4.5rem;
    height: 2.75rem;
    border-radius: 4px;
    transition: background-color .3s,opacity .3s;
    cursor: pointer
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareIcon__dqsKL {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 2rem;
    height: auto;
    color: #4d4d4d;
    transition: color .2s
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareList__aQRkr {
    position: absolute;
    left: 100%;
    top: 50%;
    height: 3.3125rem;
    padding-left: 2.5rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s,transform .3s;
    transform: translate3d(-1rem,-50%,0)
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareList__aQRkr .Header_wrapper__ZkoJG {
    position: relative;
    height: 100%;
    padding: 0 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5625rem;
    background-color: #191919
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareList__aQRkr .Header_wrapper__ZkoJG:before {
    content: "";
    position: absolute;
    top: 0;
    left: -1px;
    width: .375rem;
    height: 100%;
    background-color: #fffa00;
    transform: translateZ(0)
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareList__aQRkr .Header_shareItem__KBnsC {
    width: auto;
    height: 1.75rem;
    max-width: 2rem;
    color: #b3b3b3;
    transition: color .2s;
    cursor: pointer
}

@media(any-hover: hover) {
    .Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_ .Header_shareList__aQRkr .Header_shareItem__KBnsC:hover {
        color:#fff
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_:hover {
        background-color: #191919
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_:hover .Header_shareIcon__dqsKL {
        color: #fffa00
    }

    .Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_:hover .Header_shareList__aQRkr {
        opacity: 1;
        pointer-events: auto;
        transform: translate3d(0,-50%,0)
    }
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_.Header_active__jzCyf {
    background-color: #191919
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_.Header_active__jzCyf .Header_shareIcon__dqsKL {
    color: #fffa00
}

.Header_pcHeaderContainer__Sy_8l .Header_buttonShare__ml1S_.Header_active__jzCyf .Header_shareList__aQRkr {
    opacity: 1;
    pointer-events: auto;
    transform: translate3d(0,-50%,0)
}

.Header_pcHeaderContainer__Sy_8l .Header_switcher__JVzJX {
    position: absolute;
    left: 3.75rem;
    bottom: 1.9375rem;
    transform: translate3d(-50%,0,0);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    cursor: pointer;
    transition: transform .3s
}

.Header_pcHeaderContainer__Sy_8l .Header_switcher__JVzJX.Header_active__jzCyf {
    transform: translate3d(calc(15rem - 50%),0,0)
}

.Header_pcHeaderContainer__Sy_8l .Header_switcher__JVzJX.Header_active__jzCyf .Header_switcherImage__GWv1u {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/switcher-default.c8aa9ae0.png)
}

.Header_pcHeaderContainer__Sy_8l .Header_switcher__JVzJX .Header_switcherImage__GWv1u {
    width: 1.5625rem;
    height: .8125rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/switcher-active.c8843bb5.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

.Header_pcHeaderContainer__Sy_8l .Header_switcher__JVzJX .Header_switcherDeco__ghJ1t {
    margin-top: .375rem;
    width: 3.25rem;
    height: auto;
    color: #b9b9b9
}

.Header_h5HeaderContainer__ctquk {
    position: relative;
    width: 100%;
    height: 9.625rem;
    z-index: 50;
    color: #191919;
    background-color: #fff;
    display: flex;
    align-items: center;
    box-shadow: 0 0 2rem rgba(0,0,0,.3)
}

@media(orientation: landscape) {
    .Header_h5HeaderContainer__ctquk {
        display:none
    }
}

.Header_h5HeaderContainer__ctquk .Header_logo__s3lE_ {
    position: absolute;
    left: 0;
    top: 0;
    width: 13.125rem;
    height: 14.375rem;
    transform-origin: left top;
    transform: translate3d(3.0625rem,1.25rem,0) scale(.47);
    color: #191919;
    transition: transform .3s;
    z-index: 70
}

.Header_h5HeaderContainer__ctquk .Header_logo__s3lE_.Header_oversea__kRwH0 {
    width: 18.375rem;
    transform: translate3d(3.0625rem,2.25rem,0) scale(.568);
    height: auto
}

.Header_h5HeaderContainer__ctquk .Header_logo__s3lE_.Header_active__jzCyf {
    transform: translate3d(calc(50vw - 25rem),7.125rem,0) scale(1)
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk {
    position: absolute;
    right: 9.75rem;
    height: 4.75rem;
    display: flex;
    gap: 2.5rem
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_iconButton__KWPpn {
    position: relative;
    width: 4.75rem;
    height: 4.75rem;
    border-radius: .25rem;
    background-color: #f2f2f2
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_iconButton__KWPpn .Header_icon__3iDIG {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    height: 2.8125rem;
    width: auto;
    color: #7c7c7c
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    position: relative;
    width: 15.5rem;
    height: 4.75rem;
    box-sizing: border-box;
    padding-left: 5.375rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer
}

html[data-oversea=true] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    width: 17.5rem;
    padding-left: 4.5rem
}

html[data-oversea=true] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_tri__KNP87 {
    width: 2.25rem;
    left: 1.375rem
}

html[data-oversea=true] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_divider__tUYjO {
    left: 4.5rem
}

html[data-oversea=true] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_text__52fEh {
    font-size: 1.75rem
}

html[lang=th-th] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    width: 24rem
}

html[lang=vi-vn] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    width: 22.5rem
}

html[lang=fr-fr] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF,html[lang=id-id] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF,html[lang=ru-ru] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    width: 21.5rem
}

html[lang=de-de] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF,html[lang=es-mx] .Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF {
    width: 20rem
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF:active {
    filter: brightness(.95)
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #191919;
    background-image: linear-gradient(-45deg,transparent,transparent 16.1610023423%,black 0,black 33.8389976577%,transparent 0,transparent 66.1610023423%,black 0,black 83.8389976577%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    transform: translateZ(0);
    border-radius: 4px
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_text__52fEh {
    position: relative;
    font-family: SansMedium;
    font-size: 1.875rem;
    white-space: nowrap;
    text-align: center;
    color: #fff;
    transition: color .3s;
    transform: translateZ(0)
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_tri__KNP87 {
    position: absolute;
    left: 1.3125rem;
    width: 2.625rem;
    height: auto;
    color: #fff;
    transition: color .3s
}

.Header_h5HeaderContainer__ctquk .Header_buttonGroup___Z1Nk .Header_preserveButton__StJCF .Header_divider__tUYjO {
    position: absolute;
    left: 5.0625rem;
    width: 2px;
    height: 2.25rem;
    background-color: hsla(0,0%,100%,.5);
    transition: background-color .3s
}

.Header_h5HeaderContainer__ctquk .Header_menuIcon__X_Cn9 {
    position: absolute;
    right: 3.5rem;
    width: 3.3125rem;
    height: auto;
    color: #191919;
    z-index: 70
}

.Header_h5Menu__Tl_yj {
    position: fixed;
    overflow: hidden;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #fff;
    z-index: 60;
    transform: translate3d(-105%,0,0);
    transition: transform .3s
}

.Header_h5Menu__Tl_yj.Header_active__jzCyf {
    transform: translateZ(0)
}

@media(orientation: landscape) {
    .Header_h5Menu__Tl_yj {
        display:none
    }
}

.Header_h5Menu__Tl_yj:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: calc(100% - 14.5625rem);
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/block-bg.f05eda37.svg);
    background-size: 13.5625rem 13.5625rem;
    background-position: bottom 2px center;
    opacity: .1
}

.Header_h5Menu__Tl_yj:after {
    content: "";
    position: absolute;
    height: .125rem;
    left: calc(50% - 25rem);
    top: calc(50% + 38.3125rem);
    width: 50rem;
    background-color: #ccc
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ {
    position: absolute;
    width: 50rem;
    top: calc(50% - 34.375rem);
    left: calc(50% - 25rem);
    display: flex;
    align-items: center
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_divider__tUYjO {
    margin: 0 1.25rem;
    width: .1875rem;
    height: 3.125rem;
    background-color: #d9d9d9
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu {
    position: relative;
    height: 4rem;
    border-radius: .25rem;
    padding: 0 .75rem 0 1.75rem;
    background-color: #e5e5e5;
    display: flex;
    align-items: center
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu.Header_creator___SyYG {
    padding: 0 1.25rem
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu.Header_creator___SyYG .Header_icon__3iDIG {
    position: relative;
    top: -.125rem;
    padding-right: .5rem
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu .Header_text__52fEh {
    color: #191919;
    font-family: SansMedium;
    font-size: 2rem;
    padding-top: .14em;
    line-height: .93
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu .Header_icon__3iDIG {
    width: auto;
    height: 2.5625rem;
    color: #999
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu .Header_iconWrapper__BvBAU {
    position: relative;
    width: 2.5rem;
    height: 2.5rem;
    margin-left: 1.375rem;
    border-radius: 50%;
    background-color: #fff
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_button__b0gdu .Header_iconWrapper__BvBAU .Header_icon__3iDIG {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    height: 1.3125rem;
    width: auto;
    color: #999
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_mute__M03P_ {
    position: absolute;
    right: 0;
    height: 4rem;
    width: 4rem;
    border-radius: .25rem;
    background-color: #e5e5e5
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_mute__M03P_.Header_active__jzCyf .Header_icon__3iDIG {
    color: #ccc
}

.Header_h5Menu__Tl_yj .Header_menuButtons__IRjCZ .Header_mute__M03P_ .Header_icon__3iDIG {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,-50%,0);
    height: 2.4375rem;
    width: auto;
    color: #7c7c7c;
    transition: color .2s
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp {
    position: absolute;
    left: calc(50% - 25rem);
    top: calc(50% + 30.9375rem);
    width: 50rem;
    display: flex;
    justify-content: space-between
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu {
    position: relative;
    height: 5.5rem;
    width: 24.375rem;
    box-sizing: border-box;
    border-radius: .25rem;
    border-left: .625rem solid #fffa00;
    background-color: #191919;
    padding: 0 .5rem 0 6.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    overflow: hidden
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu .Header_text__52fEh {
    position: relative;
    font-family: SansMedium;
    font-size: 1.875rem;
    text-align: center
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu .Header_icon__3iDIG {
    position: absolute;
    left: 3.25rem;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 2.5rem;
    height: auto;
    color: #fff
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 16.1610023423%,black 0,black 33.8389976577%,transparent 0,transparent 66.1610023423%,black 0,black 83.8389976577%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat
}

.Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu:after {
    content: "";
    position: absolute;
    left: 6.25rem;
    width: .1875rem;
    height: 4.25rem;
    background-color: #717171
}

html[lang=id-id] .Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu:nth-child(2) .Header_text__52fEh,html[lang=it-it] .Header_h5Menu__Tl_yj .Header_menuBottomButtons__XFDzp .Header_button__b0gdu:nth-child(2) .Header_text__52fEh {
    font-size: 1.5rem
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN {
    position: absolute;
    top: calc(50% - 28.5rem);
    left: calc(50% - 25rem);
    width: 50rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1.1875rem
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f {
    position: relative;
    height: 6.75rem;
    padding-left: 8.9375rem;
    display: flex;
    align-items: center;
    background-color: #f2f2f2;
    border-radius: .25rem;
    overflow: hidden;
    transition: background-color .3s;
    cursor: pointer
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f.Header_active__jzCyf {
    background-color: #fffa00
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f.Header_active__jzCyf .Header_icon__3iDIG {
    color: #191919
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f.Header_active__jzCyf .Header_divider__tUYjO {
    background-color: #191919
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f.Header_active__jzCyf .Header_arrow__LqT52 {
    color: #191919
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f .Header_icon__3iDIG {
    position: absolute;
    left: 4.625rem;
    top: 50%;
    width: 3.125rem;
    height: auto;
    transform: translate3d(-50%,-50%,0);
    color: #bfbfbf;
    transition: color .3s
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f .Header_divider__tUYjO {
    position: relative;
    width: .1875rem;
    height: 5rem;
    background-color: #d9d9d9;
    transition: background-color .3s
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f .Header_text__52fEh {
    margin-left: 2.5rem;
    font-family: SansMedium;
    font-size: 2.5rem;
    padding-top: .14em;
    line-height: 1;
    color: #191919;
    transition: color .3s
}

html[lang=it-it] .Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f .Header_text__52fEh[data-key=aic] {
    font-size: 2.25rem
}

.Header_h5Menu__Tl_yj .Header_navList__r2BGN .Header_menuItem__14H7f .Header_arrow__LqT52 {
    position: absolute;
    width: auto;
    height: 1.375rem;
    right: 1.5625rem;
    color: #7c7c7c;
    transition: color .3s
}

.Header_h5Menu__Tl_yj .Header_mediaList__gE3ct {
    position: absolute;
    left: calc(50% - 25rem);
    bottom: calc(50% - 43.8125rem);
    width: 50rem;
    box-sizing: border-box;
    padding: 0 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4rem
}

html[lang=en-us] .Header_h5Menu__Tl_yj .Header_mediaList__gE3ct,html[lang=ko-kr] .Header_h5Menu__Tl_yj .Header_mediaList__gE3ct,html[lang=zh-cn] .Header_h5Menu__Tl_yj .Header_mediaList__gE3ct {
    justify-content: space-between;
    gap: 0
}

.Header_h5Menu__Tl_yj .Header_mediaList__gE3ct .Header_mediaItem__mUuKL {
    height: 3.375rem;
    width: auto;
    color: #777;
    flex-shrink: 0
}

.Header_h5Menu__Tl_yj .Header_hallowText__ZR39f {
    position: absolute;
    bottom: -5.5rem;
    left: 50%;
    transform: translateX(-50%);
    font-size: 20rem;
    height: 20rem;
    letter-spacing: -.1em
}

.Header_langs__ERYvg {
    position: relative;
    height: 100%;
    padding: 0 1.5rem
}

@media(orientation: portrait) {
    .Header_langs__ERYvg {
        width:1.5rem;
        padding: 0 .5rem
    }
}

.Header_langs__ERYvg a {
    text-decoration: none
}

.Header_langs__ERYvg .Header_trigger__FIaPM {
    cursor: pointer;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center
}

.Header_langs__ERYvg .Header_trigger__FIaPM .Header_img__BR0DK {
    display: block;
    width: 2.75rem;
    height: 2.75rem
}

@media(orientation: portrait) {
    .Header_langs__ERYvg .Header_trigger__FIaPM .Header_img__BR0DK {
        width:1.5rem;
        height: 1.5rem
    }
}

.Header_langs__ERYvg .Header_dropDown__YJW7l {
    position: absolute;
    top: 100%;
    left: 50%;
    text-align: center;
    transform: translateX(-50%);
    padding: 1rem;
    background-color: rgba(20,20,20,.9);
    border-radius: 1rem;
    display: flex;
    flex-direction: column
}

@media(orientation: portrait) {
    .Header_langs__ERYvg .Header_dropDown__YJW7l {
        padding:.25rem .5rem
    }
}

.Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO {
    cursor: pointer;
    white-space: nowrap;
    margin: .25rem 0;
    padding: .5rem 1rem;
    color: #fff;
    font-family: sans-serif;
    font-weight: 700;
    border-radius: 100vw
}

@media(orientation: portrait) {
    .Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO {
        padding:.25rem .5rem;
        margin: .125rem 0;
        font-size: .625rem
    }
}

.Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO.Header_active__jzCyf {
    background-color: #ffcc1a;
    color: #000
}

.Header_langs__ERYvg .Header_dropDown__YJW7l:before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 25%;
    display: block;
    height: .375rem;
    border-radius: .188rem;
    background-color: #ffcc1a
}

@media(orientation: portrait) {
    .Header_langs__ERYvg .Header_dropDown__YJW7l:before {
        left:50%;
        height: .188rem;
        border-radius: .094rem;
        transform: translateX(-50%);
        bottom: calc(100% + .0625rem)
    }
}

.Header_langs__ERYvg .Header_trigger__FIaPM {
    transition: opacity .3s;
    opacity: .3
}

.Header_langs__ERYvg .Header_dropDown__YJW7l {
    transition: opacity .3s,visibility .3s;
    opacity: 0;
    visibility: hidden
}

.Header_langs__ERYvg .Header_dropDown__YJW7l:before {
    width: 0;
    transition: width .3s
}

.Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO {
    transition: opacity .3s;
    opacity: .3
}

.Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO.Header_active__jzCyf,.Header_langs__ERYvg .Header_dropDown__YJW7l .Header_langItem__JNQaO:hover,.Header_langs__ERYvg:hover .Header_trigger__FIaPM {
    opacity: 1
}

.Header_langs__ERYvg:hover .Header_dropDown__YJW7l {
    opacity: 1;
    visibility: visible
}

.Header_langs__ERYvg:hover .Header_dropDown__YJW7l:before {
    width: 50%
}

@media(orientation: portrait) {
    .Header_langs__ERYvg:hover .Header_dropDown__YJW7l:before {
        width:25%
    }
}

.ReserveFooter_reserveFooter__XPe9B {
    position: relative;
    height: 31.625rem;
    width: 100%;
    border-bottom: 1rem solid #c6c6c6;
    box-sizing: border-box;
    background-image: linear-gradient(180deg,white 15.5625rem,#fffa00 0,#fffa00)
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B {
        height:19.375rem;
        background-image: linear-gradient(180deg,white 6.3125rem,#fffa00 0,#fffa00)
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 9.8125rem);
    top: 13.5625rem
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ {
        left:calc(50% - 31.25rem);
        top: 4.625rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_icon__g8kdf {
    position: absolute;
    left: 0;
    top: 0;
    width: 4.375rem;
    height: 4.375rem;
    background-color: #191919;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fffa00
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_icon__g8kdf {
        width:3.8125rem;
        height: 3.8125rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_icon__g8kdf .ReserveFooter_reserveSvg__PtDu_ {
    width: 3.4375rem;
    height: auto;
    color: #fffa00
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_colonSvg__b1xeK {
    position: absolute;
    left: 4.75rem;
    top: 2.9375rem;
    width: auto;
    height: .875rem;
    color: #191919
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_colonSvg__b1xeK {
        left:4.125rem;
        top: 2.5rem;
        width: auto;
        height: .8125rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_efSvg__f6xLH {
    position: absolute;
    left: 6.125rem;
    top: 2.4375rem;
    width: 10.125rem;
    height: auto
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_efSvg__f6xLH {
        width:8.9375rem;
        height: auto;
        left: 5.375rem;
        top: 2.125rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_:before {
    content: "ARKNIGHTS:";
    position: absolute;
    left: 6.125rem;
    top: 1.3125rem;
    font-size: 1.5rem;
    font-family: Gilroy-Medium;
    transform: scale(.5);
    transform-origin: left top;
    line-height: 1
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_:before {
        top:1.125rem;
        left: 5.375rem;
        font-size: 1.25rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_:after {
    content: "ARKNIGHTS: ENDFIELD";
    position: absolute;
    left: 19rem;
    top: 2.4375rem;
    font-size: 1rem;
    font-family: Gilroy-Light;
    transform: scale(.8);
    transform-origin: left top;
    line-height: 1;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_:after {
        left:16.6875rem;
        top: 2.1875rem;
        font-size: 1.25rem;
        transform: scale(.5)
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_titleEn__B8wPW {
    position: absolute;
    left: 19rem;
    top: 3.25rem;
    font-size: 1.25rem;
    font-family: Gilroy-Medium;
    background-color: #fffa00;
    transform: scale(.8);
    transform-origin: left top;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoHeader___vaF_ .ReserveFooter_titleEn__B8wPW {
        left:16.6875rem;
        top: 2.875rem;
        font-size: 1.5rem;
        transform: scale(.5)
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 {
    content: "";
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 9.8125rem);
    top: 19.0625rem;
    width: 91.75rem;
    height: 5.125rem;
    box-sizing: border-box;
    padding-top: .05em;
    padding-left: .625rem;
    font-family: SansBold;
    font-size: 4.5rem;
    line-height: 5.125rem;
    color: #191919;
    background-color: #fff
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 {
        left:calc(50% - 31.25rem);
        top: 9.25rem;
        width: calc(100% - (50% - 31.25rem));
        font-size: 3.625rem;
        height: 4.1875rem;
        line-height: 4.1875rem;
        padding-top: .07em;
        padding-left: .5rem
    }
}

html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 {
    letter-spacing: -.05em
}

@media(orientation: portrait) {
    html[lang=id-id] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0,html[lang=pt-br] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 {
        font-size:2.875rem
    }

    html[lang=fr-fr] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 {
        font-size: 2.75rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 .ReserveFooter_colonSvg__b1xeK {
    position: relative;
    left: .5rem;
    top: .25rem;
    width: auto;
    height: 1.75rem
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 .ReserveFooter_colonSvg__b1xeK {
        height:1.5625rem;
        top: .125rem
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_title__iNiU0 .ReserveFooter_colonSvg__b1xeK {
        top:0
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_image__L01cE {
    position: absolute;
    bottom: 0;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-title-construction.4e773940.png);
    background-position: bottom;
    width: 43.875rem;
    height: 27.4375rem;
    left: calc(50% - 80rem + 3.75rem + 9.8125rem + 85.5rem)
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_image__L01cE {
        width:29.875rem;
        height: 18.6875rem;
        left: calc(50% - 31.25rem + 36.5625rem)
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoSvg__ljGf4 {
    position: absolute;
    top: 26.5625rem;
    left: calc(50% - 80rem + 3.75rem + 9.8125rem);
    width: 7rem;
    height: auto;
    color: #282828
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_decoSvg__ljGf4 {
        left:calc(50% - 31.25rem);
        top: 14.875rem;
        width: 5.8125rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js {
    display: none;
    position: absolute;
    top: 19.3125rem;
    right: calc(50% - 80rem + 3.75rem + 73.125rem);
    font-size: 3rem;
    font-family: SansBold;
    line-height: 1;
    color: #191919
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js {
        top:9.6875rem;
        right: calc(50% - .75rem);
        font-size: 2.25rem
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js {
        right:calc(50% - 80rem + 3.75rem + 64rem);
        top: 20.5625rem;
        font-size: 2.25rem;
        letter-spacing: -.05em
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js {
        right:calc(50% - 3.75rem);
        top: 10.4375rem;
        letter-spacing: -.05em;
        font-size: 1.5rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js:before {
    content: "";
    position: absolute;
    left: -2rem;
    top: -2rem;
    width: 5.25rem;
    height: 6rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/reserved-deco.6809092a.png)
}

html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js:before {
    left: -2.5rem
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle__QS2Js:before {
        width:3.8125rem;
        height: 4.375rem;
        left: -1.625rem;
        top: -1.625rem
    }
}

.ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
    display: none;
    position: absolute;
    top: 23.0625rem;
    right: calc(50% - 80rem + 3.75rem + 73.125rem);
    font-size: 4.5rem;
    font-family: SansBold;
    line-height: 1;
    color: #191919
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        top:12.375rem;
        right: calc(50% - .75rem);
        font-size: 3rem
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        right:calc(50% - 80rem + 3.75rem + 64rem);
        text-transform: uppercase;
        letter-spacing: -.05em
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        right:calc(50% - 3.75rem);
        text-transform: uppercase;
        letter-spacing: -.05em
    }

    html[lang=de-de] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        font-size: 2.75rem
    }

    html[lang=id-id] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70,html[lang=ko-kr] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70,html[lang=vi-vn] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        font-size: 2.5rem
    }

    html[lang=es-mx] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70,html[lang=it-it] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70,html[lang=ru-ru] .ReserveFooter_reserveFooter__XPe9B .ReserveFooter_reservedTitle2__1ek70 {
        font-size: 2rem
    }
}

.ReserveFooter_reserveFooter__XPe9B.ReserveFooter_reserved__bhYVo .ReserveFooter_decoHeader___vaF_ {
    transform: scale(.728) translate3d(0,4.5rem,0);
    transform-origin: left top
}

@media(orientation: portrait) {
    .ReserveFooter_reserveFooter__XPe9B.ReserveFooter_reserved__bhYVo .ReserveFooter_decoHeader___vaF_ {
        transform:scale(.54) translate3d(0,4.5rem,0)
    }
}

.ReserveFooter_reserveFooter__XPe9B.ReserveFooter_reserved__bhYVo .ReserveFooter_title__iNiU0 {
    display: none
}

.ReserveFooter_reserveFooter__XPe9B.ReserveFooter_reserved__bhYVo .ReserveFooter_reservedTitle2__1ek70,.ReserveFooter_reserveFooter__XPe9B.ReserveFooter_reserved__bhYVo .ReserveFooter_reservedTitle__QS2Js {
    display: block
}

.Pagination_pagination__3IDBu {
    position: relative;
    height: 5.25rem;
    box-sizing: border-box;
    border: .375rem solid #e6e6e6;
    border-radius: 2.625rem;
    background-color: #e6e6e6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3.75rem
}

@media(orientation: portrait) {
    .Pagination_pagination__3IDBu {
        height:6.25rem;
        border-radius: 3.125rem;
        border: .5rem solid #e6e6e6
    }
}

.Pagination_pagination__3IDBu.Pagination_number__LDm_X {
    gap: 0
}

.Pagination_pagination__3IDBu.Pagination_nav__BS7X4 {
    gap: .5rem
}

.Pagination_pagination__3IDBu:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 2.25rem;
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,black 0,black 36.0487470721%,transparent 0,transparent 63.9512529279%,black 0,black 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    opacity: .05
}

@media(orientation: portrait) {
    .Pagination_pagination__3IDBu:before {
        height:100%;
        width: 100%;
        border-radius: 2.625rem
    }
}

.Pagination_pagination__3IDBu.Pagination_dark__8bFUA {
    background-color: rgba(30,30,30,.8);
    border: .375rem solid rgba(0,0,0,0)
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L {
    position: relative;
    width: 4.625rem;
    height: 4.625rem;
    border-radius: 2.3125rem;
    background-color: #fafafa;
    box-shadow: 0 0 .625rem rgba(2,2,2,.3);
    cursor: pointer;
    transition: background-color .2s ease
}

@media(orientation: portrait) {
    .Pagination_pagination__3IDBu .Pagination_button__cVH8L {
        width:5.25rem;
        height: 5.25rem;
        border-radius: 2.625rem;
        box-shadow: 0 0 .625rem rgba(2,2,2,.3)
    }
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/pag-button-texture.e4e732ad.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    opacity: .4;
    transition: opacity .2s ease
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L.Pagination_disabled__WlgMt {
    cursor: not-allowed;
    pointer-events: none
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L.Pagination_disabled__WlgMt .Pagination_arrow__xgX6n {
    color: #aaa
}

@media(any-hover: hover) {
    .Pagination_pagination__3IDBu .Pagination_button__cVH8L:not(.Pagination_disabled__WlgMt):hover {
        background-color:#fffa00
    }

    .Pagination_pagination__3IDBu .Pagination_button__cVH8L:not(.Pagination_disabled__WlgMt):hover:before {
        opacity: 1
    }
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L:not(.Pagination_disabled__WlgMt):active {
    background-color: #eeea00
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_border__Sfc_h {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_border__Sfc_h:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: .375rem solid #e6e6e6;
    box-sizing: border-box
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_border__Sfc_h:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: .25rem solid #fff;
    box-sizing: border-box
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_arrow__xgX6n {
    position: absolute;
    left: 1.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.125rem;
    height: 1.6875rem;
    color: #3c3c3c;
    transition: color .2s ease
}

@media(orientation: portrait) {
    .Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_arrow__xgX6n {
        left:2rem
    }
}

.Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_arrow__xgX6n.Pagination_right__NDQb6 {
    left: 1.9375rem;
    transform: translateY(-50%) scaleX(-1)
}

@media(orientation: portrait) {
    .Pagination_pagination__3IDBu .Pagination_button__cVH8L .Pagination_arrow__xgX6n.Pagination_right__NDQb6 {
        left:2.25rem
    }
}

.Pagination_pagination__3IDBu .Pagination_paginationNumber__zqV_V {
    width: 4.5rem;
    padding: 0 1.5rem;
    display: flex;
    justify-content: space-between;
    font-family: Novecentosanswide-Medium;
    font-size: 1.5rem;
    line-height: 1
}

.Pagination_pagination__3IDBu .Pagination_paginationNumber__zqV_V .Pagination_divider__6dcPw {
    position: relative;
    top: .125rem
}

.Pagination_carousel__A3MAp {
    position: relative;
    height: 2rem;
    display: flex;
    align-items: center;
    -webkit-mask-image: linear-gradient(90deg,transparent 0,transparent .25rem,black .5rem,black calc(100% - .5rem),transparent calc(100% - .25rem),transparent);
    mask-image: linear-gradient(90deg,transparent 0,transparent .25rem,black .5rem,black calc(100% - .5rem),transparent calc(100% - .25rem),transparent)
}

.Pagination_carousel__A3MAp .Pagination_block__RqQAA {
    position: absolute;
    font-size: 1.25rem;
    left: 0;
    height: 1rem;
    box-sizing: border-box;
    padding-bottom: .125rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Novecentosanswide-Medium;
    transition: transform .3s ease;
    color: #3c3c3c
}

.Pagination_carousel__A3MAp .Pagination_block__RqQAA:not(:first-child) {
    border-left: 1px solid #191919
}

.Pagination_carousel__A3MAp .Pagination_block__RqQAA.Pagination_active__jZfae {
    font-family: Novecentosanswide-Bold;
    color: #191919
}

.SubpageHeader_subpageHeader__eGnaM {
    position: relative;
    height: 31.625rem;
    width: 100%;
    border-bottom: 1rem solid #c6c6c6;
    box-sizing: border-box;
    background-image: linear-gradient(180deg,white 15.5625rem,#fffa00 0,#fffa00)
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM {
        height:19.375rem;
        background-image: linear-gradient(180deg,white 6.3125rem,#fffa00 0,#fffa00)
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 20.4375rem);
    top: 13.5625rem
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq {
        left:calc(50% - 27.125rem);
        top: 4.625rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_icon__at3oV {
    position: absolute;
    left: 0;
    top: 0;
    width: 4.375rem;
    height: 4.375rem;
    background-color: #191919;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fffa00
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_icon__at3oV {
        width:3.8125rem;
        height: 3.8125rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_colonSvg__yULIW {
    position: absolute;
    left: 4.75rem;
    top: 2.9375rem;
    width: auto;
    height: .875rem;
    color: #191919
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_colonSvg__yULIW {
        left:4.125rem;
        top: 2.5rem;
        width: auto;
        height: .8125rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_efSvg__pA4bE {
    position: absolute;
    left: 6.125rem;
    top: 2.4375rem;
    width: 10.125rem;
    height: auto
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_efSvg__pA4bE {
        width:8.9375rem;
        height: auto;
        left: 5.375rem;
        top: 2.125rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq:before {
    content: "ARKNIGHTS:";
    position: absolute;
    left: 6.125rem;
    top: 1.3125rem;
    font-size: 1.5rem;
    font-family: Gilroy-Medium;
    transform: scale(.5);
    transform-origin: left top;
    line-height: 1
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq:before {
        top:1.125rem;
        left: 5.375rem;
        font-size: 1.25rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq:after {
    content: "ARKNIGHTS: ENDFIELD";
    position: absolute;
    left: 19rem;
    top: 2.4375rem;
    font-size: 1rem;
    font-family: Gilroy-Light;
    transform: scale(.8);
    transform-origin: left top;
    line-height: 1;
    white-space: nowrap
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq:after {
        left:16.6875rem;
        top: 2.1875rem;
        font-size: 1.25rem;
        transform: scale(.5)
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_titleEn__lisEh {
    position: absolute;
    left: 19rem;
    top: 3.25rem;
    font-size: 1.25rem;
    font-family: Gilroy-Medium;
    background-color: #fffa00;
    transform: scale(.8);
    transform-origin: left top;
    line-height: 1;
    text-transform: uppercase
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_titleEn__lisEh {
        left:16.6875rem;
        top: 2.875rem;
        font-size: 1.5rem;
        transform: scale(.5)
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_decoSvg__AQpX4 {
    position: absolute;
    top: 13rem;
    left: 0;
    width: 7rem;
    height: auto;
    color: #282828
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_decoHeader__9Vyiq .SubpageHeader_decoSvg__AQpX4 {
        top:10.3125rem;
        width: 5.8125rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_title__Rf0BE {
    content: "";
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 20.4375rem);
    top: 19.0625rem;
    width: 95.75rem;
    height: 5.125rem;
    box-sizing: border-box;
    padding-top: .05em;
    padding-left: .625rem;
    font-family: SansBold;
    font-size: 4.5rem;
    line-height: 5.125rem;
    color: #191919;
    background-color: #fff
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_title__Rf0BE {
        left:calc(50% - 27.125rem);
        top: 9.25rem;
        width: calc(100% - (50% - 27.125rem));
        font-size: 3.625rem;
        height: 4.1875rem;
        line-height: 4.1875rem;
        padding-top: .07em;
        padding-left: .5rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_title__Rf0BE .SubpageHeader_colonSvg__yULIW {
    position: relative;
    left: .5rem;
    top: .25rem;
    width: auto;
    height: 1.75rem
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_title__Rf0BE .SubpageHeader_colonSvg__yULIW {
        height:1.5625rem;
        top: .125rem
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_image__DVTAW {
    position: absolute;
    bottom: 0;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: bottom
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_image__DVTAW.SubpageHeader_pumper__2VDbX {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-title-pumper.86938bc4.png);
    width: 28rem;
    height: 26.875rem;
    left: calc(50% - 80rem + 3.75rem + 20.4375rem + 86rem)
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_image__DVTAW.SubpageHeader_pumper__2VDbX {
        background-image:url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-title-pumper-h5.fa5fcf19.png);
        width: 16rem;
        height: 16.25rem;
        left: calc(50% - 27.125rem + 38.25rem)
    }
}

.SubpageHeader_subpageHeader__eGnaM .SubpageHeader_image__DVTAW.SubpageHeader_bolt__knBZT {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-title-bolt.0f4dd4e2.png);
    width: 36.6875rem;
    height: 27.5rem;
    left: calc(50% - 80rem + 3.75rem + 20.4375rem + 78rem)
}

@media(orientation: portrait) {
    .SubpageHeader_subpageHeader__eGnaM .SubpageHeader_image__DVTAW.SubpageHeader_bolt__knBZT {
        background-image:url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/subpage-title-bolt-h5.f805e784.png);
        width: 19.3125rem;
        height: 15.5rem;
        left: calc(50% - 27.125rem + 35.375rem)
    }
}

.SubpageTab_scroll___XPu9 {
    height: 3.75rem;
    overflow: hidden;
    width: 114.375rem
}

@media(orientation: portrait) {
    .SubpageTab_scroll___XPu9 {
        width:54.375rem;
        height: 4rem
    }
}

.SubpageTab_subpageTab__A3JdU {
    position: relative;
    height: 3.75rem;
    display: flex;
    align-items: center;
    width: max-content
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU {
        height:4rem
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ {
    position: relative;
    width: .1875rem;
    height: 2.5rem;
    background-color: #d9d9d9;
    margin: 0 .625rem
}

@media(orientation: landscape) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ:first-child,.SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ:last-child {
        display:none
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ:first-child {
    margin-left: 0
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ:last-child {
    margin-right: 0
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_divider__Mj7nZ {
        margin:0 .5rem
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv {
    position: relative;
    padding: 0 3rem;
    height: 100%;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: background-color .2s ease;
    cursor: pointer
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv {
        padding:0 2.25rem;
        box-sizing: border-box
    }
}

@media(any-hover: hover) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv:hover {
        background-color:#f3f3f3
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv.SubpageTab_active__fHDLL {
    background-color: #e5e5e5
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv.SubpageTab_active__fHDLL .SubpageTab_text__x2QY7 {
    transform: translate3d(-1.75rem,0,0)
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv.SubpageTab_active__fHDLL .SubpageTab_text__x2QY7 {
        transform:translate3d(-1.5rem,0,0)
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv.SubpageTab_active__fHDLL .SubpageTab_arrow__vyyID {
    opacity: 1
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv .SubpageTab_text__x2QY7 {
    position: relative;
    font-size: 1.75rem;
    font-family: SansMedium;
    line-height: 1;
    color: #191919;
    white-space: nowrap;
    transition: transform .2s ease
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv .SubpageTab_text__x2QY7 {
        width:max-content;
        font-size: 2rem
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv .SubpageTab_arrow__vyyID {
    position: absolute;
    right: .625rem;
    width: 2.3125rem;
    height: 2.3125rem;
    border-radius: 50%;
    opacity: 0;
    background-color: #fafafa;
    transition: opacity .2s ease
}

@media(orientation: portrait) {
    .SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv .SubpageTab_arrow__vyyID {
        right:.625rem
    }
}

.SubpageTab_subpageTab__A3JdU .SubpageTab_tab__qSWqv .SubpageTab_arrow__vyyID .SubpageTab_arrowIcon__9MnL3 {
    position: absolute;
    top: 50%;
    left: 50%;
    height: 1.3125rem;
    width: auto;
    transform: translate3d(-50%,-50%,0);
    color: #999
}

.SectionViewer_sectionViewer__aALTd {
    position: relative;
    width: 100%;
    display: flex
}

@media(orientation: portrait) {
    .SectionViewer_sectionViewer__aALTd {
        flex-direction:column
    }
}

.SectionViewer_sectionViewer__aALTd .SectionViewer_header__G6fOm {
    position: -webkit-sticky!important;
    position: sticky!important;
    flex-shrink: 0;
    top: 0
}

.SectionViewer_sectionViewer__aALTd .SectionViewer_contentContainer__5TWfV {
    flex: 1 1;
    width: 100%;
    overflow: hidden
}

@media(orientation: portrait) {
    .SectionViewer_sectionViewer__aALTd .SectionViewer_contentContainer__5TWfV .SectionViewer_section__ErA17 {
        scroll-margin-top:9.625rem
    }
}

.__00-Loading_container__aBijT {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #141414;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100
}

.__00-Loading_container__aBijT svg {
    display: block;
    width: 100%;
    height: auto
}

.__00-Loading_container__aBijT .__00-Loading_bg__mahvH {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/bg.9e174372.jpg);
    background-size: cover;
    background-position: 50%;
    background-repeat: no-repeat;
    filter: blur(8px)
}

@media(orientation: portrait) {
    .__00-Loading_container__aBijT .__00-Loading_bg__mahvH {
        background-image:url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/bg_m.529c4e62.jpg)
    }
}

.__00-Loading_container__aBijT.__00-Loading_leaving__IKIPd {
    transition: opacity 1s 1.4s;
    opacity: 0
}

.__00-Loading_container__aBijT.__00-Loading_leaving__IKIPd:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fffa00;
    transform-origin: left;
    transform: scaleX(0);
    animation: __00-Loading_fadeIn__CDcQn .6s cubic-bezier(1,0,.7,1) .5s forwards
}

@keyframes __00-Loading_fadeIn__CDcQn {
    0% {
        transform: scaleX(0)
    }

    to {
        transform: scaleX(1)
    }
}

.__00-Loading_container__aBijT .__00-Loading_logo__IaIBj {
    position: absolute;
    left: 64.453125%;
    top: 27.625rem;
    width: 16.5rem;
    height: 16.75rem;
    display: flex;
    align-items: center;
    justify-content: center
}

@media(orientation: portrait) {
    .__00-Loading_container__aBijT .__00-Loading_logo__IaIBj {
        left:50%;
        top: 50rem;
        transform: translate(-50%,-50%);
        width: 19.3125rem;
        height: 20.9375rem
    }
}

.__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb {
    position: absolute;
    left: 64.453125%;
    top: 59.375rem;
    white-space: nowrap
}

@media(orientation: portrait) {
    .__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb {
        left:4.625rem;
        bottom: 5.75rem;
        top: unset
    }

    .__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb .__00-Loading_triangles__y5flj {
        display: none
    }
}

.__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb .__00-Loading_deco__EFg6B {
    margin-left: -.5rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/deco.dbe18bea.svg);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50%;
    width: 8.8125rem;
    height: 4rem
}

.__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb .__00-Loading_divider__nnOZ0 {
    margin-top: 1.25rem;
    margin-left: -21.625rem;
    margin-bottom: 1rem;
    width: 70rem;
    height: 2px;
    background-image: linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.1) 50%,rgba(255,255,255,0))
}

.__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb .__00-Loading_slogan__54Pmd {
    font-size: 1.5rem;
    font-family: SansRegular
}

.__00-Loading_container__aBijT .__00-Loading_moreDeco__rmGYb .__00-Loading_triangles__y5flj {
    position: absolute;
    left: -3.375rem;
    top: 1.5rem;
    width: 1.4375rem;
    height: 1.3125rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/triangles.bcbd794a.svg);
    background-size: 100% 100%;
    background-repeat: no-repeat
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN {
    position: absolute
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressBar__eFmW1 {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fffa00
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g {
    position: absolute;
    height: 0
}

@media(orientation: portrait) {
    .__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g {
        margin-left:.75rem;
        bottom: -1.75rem
    }
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_core__K_Z5a {
    position: absolute;
    left: 0;
    bottom: 1.625rem;
    color: #fffa00;
    line-height: 1
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_core__K_Z5a:before {
    content: "";
    display: block;
    height: 1.875rem;
    width: .5rem;
    background-color: #fffa00;
    border-radius: .25rem;
    margin-bottom: .25rem
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_core__K_Z5a .__00-Loading_value__Zf_CS {
    font-family: SansMedium;
    font-size: 4.375rem
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_core__K_Z5a .__00-Loading_symbol__2HzCd {
    font-family: SansRegular;
    font-size: 3.25rem
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_deco__EFg6B {
    position: absolute;
    color: #666;
    left: 0;
    top: -.5rem
}

.__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g .__00-Loading_deco__EFg6B:before {
    content: "";
    display: block;
    height: .5rem;
    width: .25rem;
    border-left: .5rem solid #666;
    border-right: .5rem solid #666
}

@media(orientation: portrait) {
    .__00-Loading_container__aBijT .__00-Loading_progress__649iN {
        left:0;
        bottom: 17.75rem;
        width: 82.4074074074%;
        height: 2.5rem
    }

    .__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressBar__eFmW1 {
        width: 0;
        height: 100%
    }
}

@media(orientation: landscape) {
    .__00-Loading_container__aBijT .__00-Loading_progress__649iN {
        left:0;
        top: 0;
        width: 1.25rem;
        height: 100%
    }

    .__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressBar__eFmW1 {
        width: 100%;
        height: 0
    }

    .__00-Loading_container__aBijT .__00-Loading_progress__649iN .__00-Loading_progressText__EwQ1g {
        left: 3.125rem
    }
}

.SectionTitle_sectionTitle__tAFPG {
    position: relative
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_icon__YpILA {
    position: absolute;
    left: 0;
    top: -.875rem;
    width: auto;
    height: .375rem;
    color: gray
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ {
    position: absolute;
    left: 0;
    top: 0;
    width: 6.5rem;
    height: 2rem;
    -webkit-clip-path: polygon(0 0,1000% 0,1000% 100%,0 100%);
    clip-path: polygon(0 0,1000% 0,1000% 100%,0 100%)
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ.SectionTitle_active__9ceng .SectionTitle_inner__gfAIX {
    transform: translateX(0)
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ.SectionTitle_active__9ceng .SectionTitle_inner__gfAIX .SectionTitle_arrow__qXHl7 {
    transform: rotate(0)
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ .SectionTitle_inner__gfAIX {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: #d9d9d9;
    transform: translateX(-100%);
    transition: transform .5s ease-out;
    display: flex;
    align-items: center
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ .SectionTitle_inner__gfAIX .SectionTitle_arrow__qXHl7 {
    position: absolute;
    right: .375rem;
    width: auto;
    height: 1.4375rem;
    color: #231815;
    transform: rotate(-45deg);
    transition: transform .2s ease-out .3s
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_arrowBlock__6yIDQ .SectionTitle_inner__gfAIX .SectionTitle_titleEn__dE__j {
    position: absolute;
    padding-left: .5rem;
    left: 6.5rem;
    top: 0;
    height: 2rem;
    display: flex;
    align-items: center;
    font-family: Gilroy-Medium;
    line-height: 2rem;
    font-size: 2.25rem;
    color: #141414;
    white-space: nowrap;
    opacity: 0
}

.SectionTitle_sectionTitle__tAFPG .SectionTitle_titleCn__J1sPh {
    position: absolute;
    left: 0;
    top: 2.5rem;
    font-size: 3rem;
    line-height: 1;
    font-family: SansBold;
    color: #141414;
    white-space: nowrap;
    opacity: 0
}

@media(orientation: portrait) {
    html[data-oversea=true] .SectionTitle_sectionTitle__tAFPG .SectionTitle_titleCn__J1sPh {
        text-transform:capitalize
    }
}

.SectionTitle_sectionTitle__tAFPG.SectionTitle_dark__GhLCz .SectionTitle_arrowBlock__6yIDQ .SectionTitle_inner__gfAIX .SectionTitle_titleEn__dE__j,.SectionTitle_sectionTitle__tAFPG.SectionTitle_dark__GhLCz .SectionTitle_titleCn__J1sPh {
    color: #fff
}
.__07-Milestone_sectionContainer__julbS {
    position: relative;
    width: 100%;
    height: 90rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS {
        height:110.5rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageTitle__Weyye {
    position: absolute;
    top: 19.6875rem;
    left: calc(50% - 80rem + 3.75rem + 9.4375rem);
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageTitle__Weyye {
        left:calc(50% - 30.625rem);
        top: 4.3125rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_decoIcon__Lq9UB {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 9.4375rem - 1.5rem);
    top: 9.1875rem;
    width: 12.5rem;
    height: 12.5rem;
    background-color: #f2f2f2
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_decoIcon__Lq9UB {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_decoIcon__Lq9UB .__07-Milestone_icon__W04mA {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    color: #fff;
    width: 10rem;
    height: auto
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 9.4375rem);
    top: 39.5rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r {
        left:calc(50% - 30.625rem);
        top: 11.375rem
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r {
        top: 13.9375rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_decoText__uqR5O {
    position: relative;
    left: -.4375rem;
    width: 8.75rem;
    height: auto;
    color: #999
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_decoText__uqR5O {
        width:7.8125rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
    position: relative;
    margin: .5rem 0;
    padding-top: .07em;
    line-height: .93;
    font-family: SansBold;
    font-size: 2.25rem;
    color: #191919
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        margin:.4375rem 0
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        margin: 0;
        font-family: SansMedium
    }

    html[lang=ja-jp] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ko-kr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        padding-top: 0;
        margin-bottom: .375rem
    }
}

@media(orientation: landscape) {
    html[lang=en-us] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=fr-fr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ko-kr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        margin-top:.5rem;
        font-size: 1.75rem;
        letter-spacing: -.03em
    }
}

@media(orientation: portrait) {
    html[lang=en-us] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=fr-fr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ko-kr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        font-size:2rem;
        letter-spacing: -.03em
    }
}

@media(orientation: landscape) {
    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=es-mx] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=it-it] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ja-jp] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=pt-br] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=th-th] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=vi-vn] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        margin-top:0;
        max-width: 46rem;
        font-size: 1.75rem;
        line-height: 1.25
    }
}

@media(orientation: portrait) {
    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=es-mx] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=it-it] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=ja-jp] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=pt-br] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=th-th] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b,html[lang=vi-vn] .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_title__gGG8b {
        font-size:2rem;
        max-width: 58rem;
        line-height: 1.25;
        letter-spacing: -.03em
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r .__07-Milestone_percent__CQ2DB {
    width: 7rem;
    height: 2.5rem;
    font-family: SansMedium;
    color: #191919;
    background-color: #f2f2f2;
    font-size: 2.25rem;
    padding-top: .07em;
    line-height: .93;
    display: flex;
    align-items: center;
    justify-content: center
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r:before {
    content: "";
    position: absolute;
    left: 0;
    top: 9.25rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/color-bar.1f0aa038.png);
    width: 1.125rem;
    height: 7.0625rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_pageSubtitle__CeU5r:before {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC {
    position: absolute;
    top: 69.875rem;
    left: calc(50% - 80rem + 3.75rem + 9.4375rem);
    display: flex;
    gap: .375rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC {
        top:21.9375rem;
        left: calc(50% - 16.125rem);
        display: flex;
        flex-direction: column-reverse;
        gap: 1.4375rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 {
    position: relative
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 {
        width:19.25rem
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 {
        height:7.75rem;
        display: flex;
        gap: .8125rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_special__voxfv {
        height: 14.8125rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_special__voxfv .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv .__07-Milestone_icon__W04mA {
    display: none
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_special__voxfv .__07-Milestone_giftContainer__b0Xfd {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_active__IiCcn .__07-Milestone_giftContainer__b0Xfd {
    border-color: #666
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_active__IiCcn .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv {
    -webkit-clip-path: polygon(0 0,100% 0,100% 100%,0 100%);
    clip-path: polygon(0 0,100% 0,100% 100%,0 100%)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_active__IiCcn .__07-Milestone_circle__s4W_F {
    background-color: #666
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3.__07-Milestone_active__IiCcn .__07-Milestone_circle__s4W_F:before {
    background-color: #fffa00
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw {
    position: relative;
    height: 1.25rem;
    width: 100%;
    background-color: #e5e5e5;
    overflow: hidden
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw {
        height:100%;
        width: 1.3125rem;
        background-color: #d9d9d9
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 20.5805011712%,black 0,black 29.4194988288%,transparent 0,transparent 70.5805011712%,black 0,black 79.4194988288%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    opacity: .08
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT {
    position: absolute;
    height: 100%;
    width: 100%
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT {
        left:-100%
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT {
        bottom:-100%
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:before {
    content: "";
    position: absolute;
    background-color: #383838
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:before {
        right:0;
        top: 0;
        width: 120%;
        height: 100%
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:before {
        top:0;
        left: 0;
        width: 100%;
        height: 120%
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:after {
    content: "";
    position: absolute
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:after {
        right:.1875rem;
        top: 50%;
        transform: translate3d(0,-50%,0);
        width: .375rem;
        height: .75rem;
        background-color: #fffa00;
        -webkit-clip-path: polygon(0 0,100% 50%,0 100%);
        clip-path: polygon(0 0,100% 50%,0 100%)
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_bar__MyZTw .__07-Milestone_progress__Q5KoT:after {
        top:.25rem;
        left: 50%;
        transform: translate3d(-50%,0,0);
        width: .75rem;
        height: .375rem;
        background-color: #fffa00;
        -webkit-clip-path: polygon(0 100%,50% 0,100% 100%);
        clip-path: polygon(0 100%,50% 0,100% 100%)
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_status__f86tg {
    background-color: #f2f2f2;
    transition: background-color .2s ease
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_status__f86tg {
        position:relative;
        margin-top: .4375rem;
        height: 2.5rem;
        box-sizing: border-box;
        color: #191919;
        font-family: SansMedium;
        font-size: 1.875rem;
        padding-top: .14em;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_status__f86tg {
        position:absolute;
        width: max-content;
        white-space: nowrap;
        top: calc(50% + .625rem);
        right: calc(100% + 2.875rem);
        font-family: SansRegular;
        height: 1.875rem;
        display: flex;
        align-items: center;
        font-size: 1.375rem;
        padding-top: .14em;
        line-height: 1;
        padding-inline:.375rem}

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_status__f86tg {
        right: calc(100% + .5rem);
        min-width: 8.75rem;
        justify-content: center
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_status__f86tg.__07-Milestone_active__IiCcn {
    background-color: #fffa00
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
    font-family: SansMedium;
    padding-top: .07em;
    line-height: .93;
    color: #191919;
    z-index: 3
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b.__07-Milestone_operatorTitle__2jnaJ {
        max-width:16rem
    }
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
        position:relative;
        margin-top: 1.125rem;
        font-size: 1.875rem;
        text-align: center;
        line-height: 1.125
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b .__07-Milestone_icon__W04mA {
        display: none
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
        position:absolute;
        left: 7.375rem;
        top: 50%;
        font-size: 1.875rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b:before {
        content: "ARKNIGHTS:";
        position: absolute;
        left: 0;
        top: -2.25rem;
        transform-origin: left top;
        transform: scale(.5);
        color: #191919;
        font-family: Gilroy-Medium;
        font-size: 1rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b .__07-Milestone_icon__W04mA {
        position: absolute;
        left: 0;
        top: -1.625rem;
        width: 5.8125rem;
        height: auto;
        color: #191919
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
        max-width: 22rem;
        white-space: wrap;
        top: calc(50% + 1rem);
        transform: translate3d(0,-50%,0);
        line-height: 1.125;
        font-size: 1.75rem
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b:before {
        top: -1.75rem
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b .__07-Milestone_icon__W04mA {
        top: -1.125rem
    }

    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b,html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b,html[lang=it-it] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b,html[lang=vi-vn] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
        font-size: 1.625rem
    }

    html[lang=ko-kr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_title__gGG8b {
        font-size: 1.75rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx {
    position: absolute;
    width: 100%;
    top: -5.3125rem;
    display: flex;
    justify-content: center;
    align-items: baseline;
    color: #191919
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx {
        width:max-content;
        top: calc(50% - 2.625rem);
        right: calc(100% + 1.25rem)
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx {
        top:-4.5rem
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx {
        top:calc(50% - 2.25rem);
        right: calc(100% + .5rem)
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_label__MizIL {
    font-family: Gilroy-ExtraBold;
    letter-spacing: -.05em;
    font-size: 4.75rem;
    line-height: 1
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_label__MizIL {
        font-size:3.75rem
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_label__MizIL {
        font-size:3rem
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_label__MizIL {
        font-size:2.75rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_unit__vXMbo {
    position: relative;
    top: -.07em;
    margin-left: .5rem;
    font-family: SansMedium;
    font-size: 2.25rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_count__DbxAx .__07-Milestone_unit__vXMbo {
        font-size:1.375rem;
        margin-left: .25rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd {
    background-color: #f2f2f2
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd {
        position:absolute;
        left: 50%;
        transform: translate3d(-50%,0,0);
        top: -18.25rem;
        height: 10.5rem;
        width: 10.5rem;
        box-sizing: border-box;
        border-bottom: .5rem solid #ccc;
        transition: border-color .4s ease
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd {
        position:relative;
        width: 41.5rem;
        height: 100%;
        overflow: hidden
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_bg__DjHu1 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: hidden
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_bg__DjHu1:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 16.1610023423%,black 0,black 33.8389976577%,transparent 0,transparent 66.1610023423%,black 0,black 83.8389976577%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    -webkit-mask-image: linear-gradient(180deg,rgba(0,0,0,0) 20%,rgb(0,0,0) 70%,rgb(0,0,0));
    mask-image: linear-gradient(180deg,rgba(0,0,0,0) 20%,rgb(0,0,0) 70%,rgb(0,0,0));
    opacity: .05
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_bg__DjHu1:before {
        -webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,0) 20%,rgb(0,0,0) 70%,rgb(0,0,0));
        mask-image: linear-gradient(90deg,rgba(0,0,0,0) 20%,rgb(0,0,0) 70%,rgb(0,0,0))
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    transition: -webkit-clip-path .4s ease;
    transition: clip-path .4s ease;
    transition: clip-path .4s ease,-webkit-clip-path .4s ease;
    background-color: #fffa00;
    -webkit-clip-path: polygon(0 100%,100% 100%,100% 100%,0 100%);
    clip-path: polygon(0 100%,100% 100%,100% 100%,0 100%)
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv {
        -webkit-clip-path:polygon(0 0,0 0,0 100%,0 100%);
        clip-path: polygon(0 0,0 0,0 100%,0 100%)
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,#fff600 0,#fff600 36.0487470721%,transparent 0,transparent 63.9512529279%,#fff600 0,#fff600 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv:before {
        background-image:linear-gradient(-45deg,transparent,transparent 11.7415035135%,#fff600 0,#fff600 38.2584964865%,transparent 0,transparent 61.7415035135%,#fff600 0,#fff600 88.2584964865%,transparent 0,transparent);
        background-size: .5rem .5rem;
        background-repeat: repeat;
        background-size: .75rem .75rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv .__07-Milestone_icon__W04mA {
    position: absolute;
    width: 7.125rem;
    height: auto;
    color: #ffeb00;
    top: 50%;
    right: 1.0625rem;
    transform: translate3d(0,-50%,0)
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_layer__3Mahv .__07-Milestone_icon__W04mA {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8 {
    position: absolute;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 100%;
    height: 100%;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8[data-key=exp] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/exp.975dbd7c.png)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8[data-key=gacha-5] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/gacha-5.2f40c7b9.png)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8[data-key=gold] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/gold.c2f3b646.png)
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8 {
        left:50%
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8 {
        width:8rem;
        height: 8rem;
        right: 9.375rem;
        transform: translate3d(50%,-50%,0)
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8[data-key=gacha-5] {
        width: 9rem;
        height: 9rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_giftContainer__b0Xfd .__07-Milestone_image__Uc8V8[data-key=gold] {
        top: calc(50% + .5rem);
        width: 9rem;
        height: 9rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_circle__s4W_F {
    position: absolute;
    top: -8.0625rem;
    left: 50%;
    bottom: -.25rem;
    transform: translate3d(-50%,-50%,0);
    width: 2.5625rem;
    height: 2.5625rem;
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid #fff;
    background-color: #e5e5e5;
    box-shadow: 0 0 .5rem rgba(38,38,38,.5);
    transition: background-color .4s ease
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_circle__s4W_F:before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background-color: #fff;
    transition: background-color .4s ease
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_circle__s4W_F:before {
        width:1.375rem;
        height: 1.375rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_circle__s4W_F {
        top: 50%;
        left: 3.4375rem;
        width: 2.4375rem;
        height: 2.4375rem;
        transform: translate3d(0,-50%,0);
        border: .125rem solid #fff
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 {
    position: absolute
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 {
        left:50%;
        top: -26.875rem;
        width: 16.5rem;
        height: 16.5rem;
        transform: translate3d(-50%,0,0)
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 {
        width:12.5rem;
        height: 12.5rem;
        right: 1.3125rem;
        top: 50%;
        transform: translate3d(0,-50%,0)
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_image__Uc8V8 {
    position: absolute;
    left: -4.5rem;
    top: .5rem;
    width: 25.5625rem;
    height: 16.5625rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/gacha-10.7cf54d67.png)
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_image__Uc8V8 {
        left:-3.375rem;
        top: .5rem;
        width: 16.9375rem;
        height: 12.5625rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_bg__DjHu1 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_bg__DjHu1:after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 1.875rem solid #fff;
    filter: drop-shadow(0 .1875rem .5rem rgba(38,38,38,.375))
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_bg__DjHu1:after {
        border:1.5625rem solid #fff
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_drawContainer__S0jS3 .__07-Milestone_bg__DjHu1:before {
    content: "";
    position: relative;
    display: block;
    width: calc(100% - .5rem);
    height: calc(100% - .5rem);
    margin: .25rem;
    background-image: linear-gradient(225deg,rgba(255,250,0,0) 20%,#fffa00 60%,#fffa00)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ {
    position: absolute;
    left: 0;
    top: 0
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ {
        width:100%;
        height: 100%
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_image__Uc8V8 {
    position: absolute;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_image__Uc8V8 {
        left:-14.25rem;
        top: -60.5625rem;
        width: 46.6875rem;
        height: 53.9375rem;
        background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/operator.69ebf0f6.png)
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_image__Uc8V8 {
        z-index:2;
        right: 0;
        bottom: 0;
        width: 39.375rem;
        height: 17.5rem;
        background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/operator-h5.b40f76d5.png);
        background-position: 100% 100%;
        -webkit-mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) 8rem,rgb(0,0,0) 20.5rem);
        mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) 8rem,rgb(0,0,0) 20.5rem)
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 {
    position: absolute;
    top: -27.0625rem;
    right: -8.3125rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #191919
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 {
        position:absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_stars__GV99E {
    position: absolute;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/stars.140c9037.png)
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_stars__GV99E {
        top:-3.0625rem;
        right: -1rem;
        transform: translate3d(0,-50%,0);
        width: 17.1875rem;
        height: 4.375rem
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_stars__GV99E {
        width:15.875rem;
        height: 4.125rem;
        right: .5625rem;
        bottom: 0;
        z-index: 4
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_nameEn__FKnVb {
    position: absolute;
    top: -1.0625rem;
    left: 0;
    width: 18rem;
    padding: 0 .5rem;
    box-sizing: border-box;
    height: 1.5rem;
    background-color: #191919;
    color: #fff;
    font-family: Novecentosanswide-Medium;
    font-size: 1.5rem;
    line-height: 1.5rem;
    transform: scale(.5);
    transform-origin: left top;
    text-align: right
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_nameEn__FKnVb {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI {
    position: relative;
    min-width: 15.375rem;
    width: max-content;
    height: 2.75rem;
    box-sizing: border-box;
    border-left: .375rem solid #a5a5a5;
    background-color: #fff;
    padding: 0 .75rem 0 3.875rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI {
        display:none
    }
}

html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI {
    letter-spacing: -.05em
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI:before {
    content: "";
    position: absolute;
    left: .9375rem;
    top: 50%;
    width: 2.125rem;
    height: 2.125rem;
    transform: translateY(-50%);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-shielder.a3c6ffc9.jpg)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI .__07-Milestone_text__kkrux {
    margin-top: .4375rem;
    display: flex;
    align-items: baseline;
    font-size: 2.1875rem;
    font-family: SansMedium;
    line-height: 1;
    color: #191919
}

@media(orientation: landscape) {
    html[lang=ja-jp] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI .__07-Milestone_text__kkrux,html[lang=th-th] .__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI .__07-Milestone_text__kkrux {
        font-size:1.875rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI .__07-Milestone_text__kkrux:before {
    position: relative;
    content: "[";
    font-size: 1.375rem;
    font-family: SansMedium;
    color: #999;
    margin-right: .8125rem
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_milestoneList__37nHC .__07-Milestone_milestoneItem__7ELq3 .__07-Milestone_operatorContainer__rCuk_ .__07-Milestone_content__oelS2 .__07-Milestone_name__g_xsI .__07-Milestone_text__kkrux:after {
    position: relative;
    content: "]";
    font-size: 1.375rem;
    font-family: SansMedium;
    color: #999;
    margin-left: .75rem
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 9.4375rem + 106.25rem);
    top: 9.5rem;
    width: 31.25rem;
    height: 75rem;
    background-color: #f2f2f2;
    overflow: hidden;
    -webkit-clip-path: polygon(0 0,100% 0,100% 0,0 0);
    clip-path: polygon(0 0,100% 0,100% 0,0 0)
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b {
        height:21.875rem;
        width: 67.5rem;
        left: 50%;
        top: 85.125rem;
        transform: translate3d(-50%,0,0);
        background-color: #e8e8e8
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(180deg,rgba(255,250,0,0) 55%,#fffa00 90%,#fffa00)
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b:after {
    content: "";
    position: absolute;
    left: 1.5rem;
    top: 1.5rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/media-deco.0a902ec1.png);
    width: 11.75rem;
    height: 3.1875rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b:after {
        display:none
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_hallowText__5BJO5 {
    position: absolute
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_hallowText__5BJO5 {
        top:-3rem;
        left: calc(100% + 5.25rem);
        transform: rotate(90deg);
        transform-origin: left top;
        font-size: 24.25rem;
        line-height: 1;
        height: 24.25rem;
        letter-spacing: -.15em;
        -webkit-mask-image: linear-gradient(90deg,rgb(0,0,0) 0,rgb(0,0,0) 10%,rgba(0,0,0,0) 60%);
        mask-image: linear-gradient(90deg,rgb(0,0,0) 0,rgb(0,0,0) 10%,rgba(0,0,0,0) 60%)
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_hallowText__5BJO5 {
        font-size:14.25rem;
        top: -1.75rem;
        left: -1rem;
        -webkit-mask-image: linear-gradient(90deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,.05));
        mask-image: linear-gradient(90deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,.05))
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml {
    position: absolute
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml {
        top:19.75rem;
        left: 50%;
        width: 17rem;
        height: 17rem;
        transform: translate3d(-50%,0,0);
        box-sizing: border-box
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml {
        right:6.25rem;
        top: 8.25rem;
        width: 10.6875rem;
        height: 10.6875rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 2.1875rem solid #fff;
    filter: drop-shadow(0 .1875rem .5rem rgba(38,38,38,.375))
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml:before {
        border:1.25rem solid #fff
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml .__07-Milestone_image__Uc8V8 {
    position: absolute;
    left: -5rem;
    top: -5.5rem;
    width: 27.75rem;
    height: 26.5rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/media.512ad562.png)
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_giftFrame__euMml .__07-Milestone_image__Uc8V8 {
        left:-3.125rem;
        top: -2.125rem;
        width: 16.125rem;
        height: 16.125rem;
        background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/media-h5.d0adbd06.png)
    }
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 {
        position:relative;
        margin-top: 47.4375rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #191919
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 {
        position:absolute;
        height: 15rem;
        width: 61.25rem;
        top: 5.8125rem;
        left: 3.125rem;
        background-color: #fff;
        box-sizing: border-box;
        padding-left: 1.5rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2:before {
        content: "";
        position: absolute;
        left: 1.5625rem;
        bottom: 0;
        height: .25rem;
        width: 12.5rem;
        background-image: linear-gradient(90deg,#ff00f0 20%,#00ffa2 0,#00ffa2 40%,#fffa00 0,#fffa00)
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 {
        margin-top:43rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_title__gGG8b {
    font-size: 3rem;
    padding-top: .07em;
    line-height: .93;
    font-family: SansBold
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_title__gGG8b {
        position:absolute;
        left: 0;
        top: -3.5625rem;
        height: 2.75rem;
        box-sizing: border-box;
        min-width: 17.5rem;
        padding-inline:1.3125rem;font-family: SansMedium;
        font-size: 2rem;
        display: flex;
        align-items: center;
        padding-top: .14em;
        line-height: 1;
        color: #fff;
        background-color: #3d3d3d
    }
}

@media(orientation: landscape) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_title__gGG8b {
        font-size:3rem;
        text-align: center
    }

    html[lang=es-mx] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_title__gGG8b,html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_title__gGG8b {
        font-size: 2.75rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 {
    margin-top: 2.25rem;
    font-size: 1.875rem;
    padding-top: .07em;
    line-height: .93;
    font-family: SansRegular
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 {
        width:max-content
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
    display: flex;
    align-items: baseline
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        justify-content:center;
        margin-top: .5rem
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        justify-content:flex-start
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy:not(:first-child) {
        display: inline-block
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy:nth-child(3) {
        margin-left: .375em
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy:first-child {
        margin-bottom: .75rem
    }

    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy:nth-child(2) {
        display: block
    }

    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy:nth-child(3) {
        margin-left: 0;
        margin-top: .5rem
    }
}

@media(orientation: landscape) {
    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=es-mx] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=fr-fr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=vi-vn] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.5rem
    }
}

@media(orientation: portrait) {
    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=es-mx] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=fr-fr] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy,html[lang=vi-vn] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.375rem
    }
}

@media(orientation: landscape) {
    html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.375rem
    }
}

@media(orientation: portrait) {
    html[lang=id-id] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.375rem
    }
}

@media(orientation: landscape) {
    html[lang=pt-br] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.25rem;
        letter-spacing: -.02em
    }
}

@media(orientation: portrait) {
    html[lang=pt-br] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy {
        font-size:1.25rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy .__07-Milestone_cnt__w2Pes {
    font-size: 3rem;
    padding: .5rem .5rem 0;
    font-family: Gilroy-ExtraBold;
    letter-spacing: -.05em
}

html[lang=pt-br] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy .__07-Milestone_cnt__w2Pes {
    font-size: 2.5rem
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 .__07-Milestone_line__F5fgy .__07-Milestone_cnt__w2Pes {
        font-size:2.25rem;
        padding: 0 .125rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_subLabel__P3dU3 {
        margin-top: 1rem;
        font-size: 1.5rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx {
    position: relative;
    display: flex;
    align-items: baseline
}

html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx {
    display: none
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx {
        margin-top:-.25rem;
        margin-bottom: -.75rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx .__07-Milestone_label__MizIL {
    font-size: 4.75rem;
    font-family: Gilroy-ExtraBold;
    letter-spacing: -.05em
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx .__07-Milestone_unit__vXMbo {
    position: relative;
    top: -.07em;
    font-size: 2.25rem;
    padding-top: .07em;
    line-height: .93;
    font-family: SansRegular
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_count__DbxAx .__07-Milestone_unit__vXMbo {
        font-size:1.5rem;
        margin-left: .25rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg {
    position: relative;
    margin-top: 0;
    width: 19.25rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.875rem;
    padding-top: .14em;
    font-family: SansBold;
    background-color: #fff;
    transition: background-color .2s ease
}

@media(orientation: landscape) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg {
        margin-top:2rem
    }
}

@media(orientation: portrait) {
    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg {
        margin-top:1.125rem
    }

    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg {
        width: max-content;
        height: 1.875rem;
        font-size: 1.5rem;
        padding-inline:.5625rem;font-family: SansRegular;
        font-size: 1.25rem;
        line-height: 1;
        background-color: #e5e5e5
    }

    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg {
        margin-top: .5rem
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_status__f86tg.__07-Milestone_active__IiCcn {
    background-color: #333;
    color: #fffa00
}

@media(orientation: landscape) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 {
        margin-top:1.125rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 {
        margin-top:.75rem;
        display: flex
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 {
        margin-top: .75rem;
        flex-direction: column
    }
}

.__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh {
    font-size: 1.875rem;
    padding-top: .07em;
    line-height: 2.1875rem;
    font-family: SansBold
}

@media(orientation: landscape) {
    html[lang=it-it] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh,html[lang=ru-ru] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh {
        font-size:1.75rem
    }
}

@media(orientation: portrait) {
    .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh {
        font-size:1.75rem;
        line-height: 1.125
    }

    html[data-oversea=true] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh {
        font-size: 1.875rem
    }

    html[lang=de-de] .__07-Milestone_sectionContainer__julbS .__07-Milestone_mediaMilestone__4_b4b .__07-Milestone_content__oelS2 .__07-Milestone_items__7WUS0 .__07-Milestone_item__Relwh {
        font-size: 1.5rem
    }
}

.__07-Milestone_milestoneTitle__Cn2iY {
    letter-spacing: -.05em
}

@media(orientation: landscape) {
    html[lang=it-it] .__07-Milestone_milestoneTitle__Cn2iY {
        font-size:2.75rem
    }
}

.__07-Milestone_animationElement___jiZS {
    opacity: 0
}

.__08-AIC_sectionContainer__XPJyn {
    position: relative;
    width: 100%;
    height: 77.25rem;
    box-sizing: border-box
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn {
        height:110.5rem
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_pageTitle__6Qc_g {
    position: absolute;
    top: 6.6875rem;
    left: calc(50% - 80rem + 3.75rem + 125rem);
    text-transform: uppercase
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_pageTitle__6Qc_g {
        left:calc(50% - 18.1875rem);
        top: 18.0625rem
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy {
    position: absolute;
    top: 15.6875rem;
    left: calc(50% - 80rem + 3.75rem + 125rem);
    color: #999;
    opacity: 0
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy {
        top:25.3125rem;
        left: calc(50% - 18.1875rem);
        opacity: 1
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy .__08-AIC_title__Y_JE9 {
    position: absolute;
    left: -.5rem;
    width: 8.8125rem;
    height: auto
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy .__08-AIC_blocks__Wli2U {
    position: absolute;
    top: 3.375rem;
    width: 3.9375rem;
    height: auto
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy .__08-AIC_blocks__Wli2U {
        display:none
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy .__08-AIC_codePrinter__bTv7W {
    position: absolute;
    left: 0;
    top: 6.9375rem
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy .__08-AIC_codePrinter__bTv7W {
        display:none
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy:after {
    content: "";
    position: absolute;
    left: 0;
    top: 5.25rem;
    width: 1.125rem;
    height: 7.0625rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/color-bar.1f0aa038.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain
}

@keyframes __08-AIC_flashing__pEebW {
    0% {
        opacity: 0
    }

    10% {
        opacity: .5
    }

    11% {
        opacity: 0
    }

    20% {
        opacity: .5
    }

    21% {
        opacity: 0
    }

    40% {
        opacity: .5
    }

    41% {
        opacity: 0
    }

    to {
        opacity: 1
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_decoLeft__MF4oy.__08-AIC_active__DvdWI {
    animation: __08-AIC_flashing__pEebW 1s ease-out forwards
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_itemIcon__hwWhR {
    position: absolute;
    left: calc(50% - 80rem + 3.75rem + 125rem);
    top: 51.0625rem;
    width: 9.25rem;
    height: 9.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #d9d9d9;
    opacity: 0
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_itemIcon__hwWhR {
        top:18.0625rem;
        left: calc(50% + 24.25rem);
        width: 5.25rem;
        height: 5.25rem
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_itemIcon__hwWhR .__08-AIC_icon__lIZuJ {
    width: 5.6875rem;
    height: auto;
    color: #a6a6a6
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_itemIcon__hwWhR .__08-AIC_icon__lIZuJ {
        width:3.625rem
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_h5Icon__adHvF {
    position: absolute;
    top: 4.625rem;
    left: calc(50% - 18.6875rem);
    height: 7.5rem;
    width: auto
}

@media(orientation: landscape) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_h5Icon__adHvF {
        display:none
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS {
    position: absolute;
    top: 0;
    left: calc(50% - 31.25rem);
    width: 8.25rem;
    height: 100%;
    background-color: #fffa00;
    overflow: hidden
}

@media(orientation: landscape) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS {
        display:none
    }
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS .__08-AIC_line__bHAKS {
    position: absolute;
    left: 1rem;
    bottom: calc(100% - 3.9375rem);
    width: calc(100vh - 9.625rem - 3.9375rem);
    height: 2.25rem;
    transform-origin: left bottom;
    transform: rotate(90deg);
    background-color: #fff
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS .__08-AIC_line__bHAKS .__08-AIC_endfield__LuTte {
    position: absolute;
    left: .875rem;
    bottom: .625rem;
    width: 15.3125rem;
    height: auto;
    color: #191919
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS .__08-AIC_line__bHAKS .__08-AIC_deco__56KkB {
    position: absolute;
    top: .5rem;
    right: 1.125rem;
    width: 10.375rem;
    height: auto
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_H5DecoLine__yfqBS .__08-AIC_line__bHAKS .__08-AIC_ak__At8gA {
    position: absolute;
    left: .9375rem;
    bottom: 3.75rem;
    line-height: 1;
    font-family: Gilroy-Medium;
    font-size: 1.125rem;
    color: #191919
}

.__08-AIC_sectionContainer__XPJyn .__08-AIC_detailButton__1bigx {
    position: absolute;
    width: 20.0625rem;
    height: 4.5rem;
    left: calc(50% - 80rem + 3.75rem + 125rem);
    top: 80.9375rem
}

@media(orientation: portrait) {
    .__08-AIC_sectionContainer__XPJyn .__08-AIC_detailButton__1bigx {
        left:calc(50% + 2.125rem);
        top: 91.5625rem;
        width: 25rem;
        height: 5.5rem
    }
}

@media(orientation: portrait)and (orientation:portrait) {
    html[data-oversea=true] .__08-AIC_sectionContainer__XPJyn .__08-AIC_detailButton__1bigx {
        top:97rem
    }
}

@media(orientation: portrait) {
    html[lang=es-mx] .__08-AIC_aicTitle__mWmiw {
        font-size:2.5rem;
        letter-spacing: -.02em
    }
}

@media(orientation: landscape) {
    html[lang=de-de] .__08-AIC_aicTitle__mWmiw {
        font-size:2.875rem;
        letter-spacing: -.02em
    }
}

@media(orientation: portrait) {
    html[lang=it-it] .__08-AIC_aicTitle__mWmiw {
        font-size:2.5rem;
        letter-spacing: -.02em
    }
}

@media(orientation: landscape) {
    html[lang=it-it] .__08-AIC_aicTitle__mWmiw {
        font-size:2.5rem;
        letter-spacing: -.02em
    }

    html[lang=id-id] .__08-AIC_aicTitle__mWmiw {
        letter-spacing: -.03em
    }

    html[lang=vi-vn] .__08-AIC_aicTitle__mWmiw {
        font-size: 2.5rem;
        letter-spacing: -.03em
    }
}

@media(orientation: portrait) {
    html[lang=vi-vn] .__08-AIC_aicTitle__mWmiw {
        font-size:2.5rem;
        letter-spacing: -.03em
    }
}

.sections_sectionViewer__326Rn {
    position: relative;
    width: 100%;
    min-height: 100vh
}

.sections_sectionViewer__326Rn .sections_contentContainer__5cMPG {
    width: 100%;
    display: flex
}

.sections_sectionViewer__326Rn .sections_contentContainer__5cMPG .sections_headerContainer__IQkt1 {
    position: -webkit-sticky;
    position: sticky;
    bottom: 0;
    width: max-content;
    height: 0;
    z-index: 10
}

.sections_sectionViewer__326Rn .sections_contentContainer__5cMPG .sections_headerContainer__IQkt1 .sections_header__8tVO2 {
    position: relative
}

.sections_sectionViewer__326Rn .sections_contentContainer__5cMPG .sections_viewerContainer__2Afuw {
    flex: 1 1
}

.sections_modalLayer__0Rqmm {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    pointer-events: none
}
.Toast_toast__ZnoVW {
    position: fixed;
    z-index: 2000;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity .3s;
    opacity: 0;
    pointer-events: none
}

.Toast_toast__ZnoVW.Toast_visible__DnNU7 {
    opacity: 1
}

.Toast_toast__ZnoVW .Toast_content__a8lPb {
    position: fixed;
    z-index: 100;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-50%,0);
    text-align: center;
    font-size: 16px;
    line-height: 1.4;
    width: max-content;
    max-width: 330px;
    padding: .75em 1.25em;
    border-radius: .25em;
    font-family: unset;
    color: #fff;
    background-color: rgba(0,0,0,.8);
    pointer-events: none
}
.__02-Operator_sectionDivider__PbN7_ {
    position: relative;
    width: 100%;
    margin-bottom: 2rem;
    height: 9.125rem;
    box-sizing: border-box;
    padding-left: 30.625rem;
    padding-top: 2.25rem;
    line-height: 1
}

@media(orientation: portrait) {
    .__02-Operator_sectionDivider__PbN7_ {
        padding-right:6.75rem;
        padding-top: 2.25rem;
        text-align: right;
        margin-bottom: 2.5rem
    }
}

.__02-Operator_sectionDivider__PbN7_.__02-Operator_active__5YfL8:before {
    transform: translateX(0)
}

.__02-Operator_sectionDivider__PbN7_.__02-Operator_active__5YfL8 .__02-Operator_dividerSubtitle__bTAer,.__02-Operator_sectionDivider__PbN7_.__02-Operator_active__5YfL8 .__02-Operator_dividerTitle__yHdrt,.__02-Operator_sectionDivider__PbN7_.__02-Operator_active__5YfL8:after {
    transform: translateX(0);
    opacity: 1
}

.__02-Operator_sectionDivider__PbN7_:before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: #fffa00;
    transform: translateX(100%);
    transition: transform .4s ease .2s
}

.__02-Operator_sectionDivider__PbN7_:after {
    content: "";
    position: absolute;
    left: 1.5rem;
    bottom: 0;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/section_divider_icon_lore.6968c414.png);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50%;
    width: 28.25rem;
    height: 14.25rem;
    transform: translateX(15%);
    opacity: 0;
    transition: transform .3s ease .4s,opacity .3s ease .4s
}

@media(orientation: portrait) {
    .__02-Operator_sectionDivider__PbN7_:after {
        left:57px;
        width: 25.425rem;
        height: 12.825rem
    }
}

.__02-Operator_sectionDivider__PbN7_ .__02-Operator_dividerSubtitle__bTAer {
    font-size: 1.875rem;
    font-family: Gilroy-Light;
    transform: translateX(2rem);
    opacity: 0;
    transition: transform .3s ease .5s,opacity .3s ease .5s
}

.__02-Operator_sectionDivider__PbN7_ .__02-Operator_dividerTitle__yHdrt {
    font-size: 3.75rem;
    font-family: Gilroy-Medium;
    transform: translateX(2rem);
    opacity: 0;
    transition: transform .3s ease .6s,opacity .3s ease .6s
}

.__02-Operator_sectionContainer__D66c4 {
    position: relative;
    width: 100%;
    height: 90rem;
    box-sizing: border-box;
    overflow: hidden
}

@media(orientation: portrait) {
    .__02-Operator_sectionContainer__D66c4 {
        height:110.5rem
    }

    .__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU {
        display: none
    }
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX {
    position: absolute;
    left: calc(50% - 49.4375rem - 3.75rem);
    top: 14.1875rem;
    margin-left: .3125rem;
    -webkit-clip-path: polygon(0 0,100% 0,100% 100%,0 100%);
    clip-path: polygon(0 0,100% 0,100% 100%,0 100%)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_headerInnerContainer__VBx3B {
    pointer-events: auto
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN {
    width: 8.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: Novecentosanswide-DemiBold
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_leftBracket__MSSfG,.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_rightBracket__YpY2O {
    color: #999;
    font-size: 1.375rem;
    line-height: 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_title__Qc2kT {
    font-size: 1.5625rem;
    line-height: 1;
    color: #191919
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoTextIcon__KoX_N {
    position: absolute;
    left: 9.6875rem;
    top: .3125rem;
    width: 10rem;
    height: auto;
    color: #999
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_nameContainer__yjlQE {
    margin-top: .875rem;
    width: 19.375rem;
    height: 1.25rem;
    background-color: #d9d9d9;
    color: #191919;
    font-family: Gilroy-Medium;
    font-size: 1rem;
    line-height: 1.25rem;
    padding: .0625rem .25rem;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_stars__ebGpw {
    margin-top: 1.25rem;
    display: flex;
    gap: .1875rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_headerDeco__LZ5YX .__02-Operator_stars__ebGpw .__02-Operator_star__2BUbj {
    width: 3.8125rem;
    height: 4.1875rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/star.c078a0a7.png)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 {
    position: absolute;
    padding: 2rem 0;
    top: 53.4375rem;
    left: calc(50% - 49.4375rem - 3.75rem);
    -webkit-clip-path: polygon(0 0,100% 0,100% 100%,0 100%);
    clip-path: polygon(0 0,100% 0,100% 100%,0 100%)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_titleInnerContainer__1rOJW {
    position: relative;
    pointer-events: auto
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x {
    position: absolute;
    left: 0;
    top: 1.0625rem;
    display: flex
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC {
    height: 3.375rem;
    width: 3.375rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=fire] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-fire.97dcd67b.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=ice] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-ice.134e8d15.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=electric] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-electric.a3874677.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=physic] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-physic.2c205b7a.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=nature] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-nature.0606ebde.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=assault] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-assault.2aeeaf48.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=caster] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-caster.d469c805.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=guard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-guard.78502de4.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=shielder] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-shielder.a3c6ffc9.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=support] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-support.532f02bd.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=vanguard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-vanguard.b957cec2.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_nameContainer__yjlQE {
    position: relative;
    margin-left: 9rem;
    display: flex;
    align-items: baseline;
    gap: 2.5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_nameContainer__yjlQE .__02-Operator_leftBracket__MSSfG,.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_nameContainer__yjlQE .__02-Operator_rightBracket__YpY2O {
    color: #797979;
    font-size: 3.375rem;
    line-height: 1;
    font-family: SansMedium;
    text-shadow: 0 0 .25rem #fff,0 0 .5rem #fff,0 0 .75rem #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_nameContainer__yjlQE .__02-Operator_title__Qc2kT {
    font-size: 4.875rem;
    line-height: 1;
    color: #191919;
    font-family: SansBold;
    text-shadow: 0 0 .25rem #fff,0 0 .5rem #fff,0 0 .75rem #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_titleContainer__6rOf9 .__02-Operator_decoLine___SBw8 {
    position: absolute;
    top: 6.5625rem;
    left: 0;
    width: 67.5rem;
    height: .25rem;
    background-image: linear-gradient(90deg,#ff00f0 11.25rem,#fffa00 0,#fffa00 22.5625rem,#00ffa2 0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U {
    position: absolute;
    top: 63.4375rem;
    left: calc(50% - 49.4375rem - 3.75rem);
    -webkit-clip-path: polygon(0 0,100% 0,100% 100%,0 100%);
    clip-path: polygon(0 0,100% 0,100% 100%,0 100%)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_contentInnerContainer__G4CVt {
    pointer-events: auto
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_tagContainer__dKENE {
    height: 2rem;
    display: flex;
    gap: 2.5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_tag__FQrt0 {
    height: 100%;
    display: flex;
    font-size: 1.375rem;
    line-height: 2.25rem;
    font-family: SansMedium
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_tag__FQrt0 .__02-Operator_label__3koYX {
    padding: 0 2rem;
    background-color: #191919;
    color: #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_tag__FQrt0 .__02-Operator_value__w_bbs {
    background-color: #f2f2f2;
    color: #191919;
    padding: 0 .75rem;
    min-width: 15rem;
    width: max-content;
    text-align: center
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT {
    margin-top: 2rem;
    width: 46.0625rem;
    height: 15.625rem;
    font-size: 1.5625rem;
    font-family: SansRegular;
    text-shadow: 0 0 .25rem #fff,0 0 .5rem #fff,0 0 .75rem #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT.__02-Operator_longer__x_XyC {
    width: 48rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_line__XUiut:not(:first-child) {
    margin-top: .5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d:before {
    content: "";
    position: absolute;
    right: 0;
    top: 0;
    width: 39.1875rem;
    height: 26.3125rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/wave-bg.8955885a.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: 100% 0
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_shallowBg__E2XaH {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 32.8125rem;
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,black 0,black 36.0487470721%,transparent 0,transparent 63.9512529279%,black 0,black 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    background-size: .75rem .75rem;
    -webkit-mask-image: linear-gradient(0deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,0));
    mask-image: linear-gradient(0deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,0));
    opacity: .05
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_shallowBg__E2XaH:before {
    content: "";
    position: absolute;
    left: 4.125rem;
    bottom: 3.0625rem;
    width: calc(100% - 4.125rem);
    height: calc(100% - 3.0625rem);
    background-size: 12.8125rem 12.8125rem;
    background-position: left bottom 3px;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/block-bg.f05eda37.svg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoFlag__xm7_G {
    position: absolute;
    left: 4.125rem;
    bottom: 3.0625rem;
    width: calc(100% - 4.125rem);
    height: calc(100% - 3.0625rem);
    -webkit-mask-image: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,0));
    mask-image: linear-gradient(180deg,rgb(0,0,0) 0,rgb(0,0,0) 50%,rgba(0,0,0,0));
    -webkit-clip-path: polygon(calc(50% - 22rem + 3.75rem) 0,calc(50% + 32.625rem + 3.75rem) 0,calc(50% + 32.625rem + 3.75rem) 100%,calc(50% - 22rem + 3.75rem) 100%);
    clip-path: polygon(calc(50% - 22rem + 3.75rem) 0,calc(50% + 32.625rem + 3.75rem) 0,calc(50% + 32.625rem + 3.75rem) 100%,calc(50% - 22rem + 3.75rem) 100%);
    background-color: #fffa00
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoFlag__xm7_G:before {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background-size: 12.8125rem 12.8125rem;
    background-position: left bottom 3px;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/block-bg.f05eda37.svg);
    opacity: .05
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoText__3RgCN {
    position: absolute;
    left: calc(50% - 49.4375rem - 3.75rem);
    margin-left: -1.5rem;
    top: 26.6875rem;
    height: 21.5625rem;
    font-family: Novecentosanswide-Bold;
    -webkit-background-clip: text;
    background-clip: text;
    color: rgba(0,0,0,0);
    font-size: 30.5rem;
    line-height: .58;
    letter-spacing: -.08em
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoTape__9rSYk {
    position: absolute;
    top: 48.8125rem;
    left: 0;
    width: 100%;
    height: 13.5rem;
    -webkit-mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) calc(50% - 59.5rem + 3.75rem),rgb(0,0,0));
    mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) calc(50% - 59.5rem + 3.75rem),rgb(0,0,0));
    background-color: #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoTape__9rSYk:before {
    content: "";
    position: absolute;
    top: 0;
    left: calc(50% - 59.5rem + 3.75rem);
    width: 59.125rem;
    height: 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/tape-wave-bg.2bce9fc0.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoTape__9rSYk .__02-Operator_decoLineTri__NSSu_ {
    position: absolute;
    bottom: 0;
    left: calc(50% - 49.4375rem - 3.75rem);
    width: 67.5rem;
    height: .25rem;
    background-image: linear-gradient(90deg,#ff00f0 11.25rem,#fffa00 0,#fffa00 22.5625rem,#00ffa2 0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoLine___SBw8 {
    position: absolute;
    left: calc(50% - 49.4375rem - 3.75rem);
    top: 49.9375rem;
    width: 100%;
    box-sizing: border-box;
    height: .625rem;
    background-image: linear-gradient(90deg,#bfbfbf 6.25rem,transparent 0,transparent 26.5625rem,#bfbfbf 0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoLine___SBw8 .__02-Operator_decoLineIcon__C5C_n {
    position: absolute;
    left: 7.5625rem;
    top: 50%;
    width: 17.8125rem;
    height: auto;
    transform: translateY(-50%);
    color: #ccc
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoPlus__QPwgU {
    position: absolute;
    left: calc(50% - 76rem + 3.75rem);
    top: 5.9375rem;
    width: 2rem;
    height: auto;
    color: #f2f2f2
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_switchLayer__T81bw .__02-Operator_switcher3d__I_Eai {
    position: absolute;
    top: 55.5rem;
    left: calc(50% + 61.9375rem - 3.75rem);
    width: 4.5rem;
    height: 7.5rem;
    box-sizing: border-box;
    border: 3px solid #666;
    border-radius: 2.25rem;
    background-color: rgba(0,0,0,.5);
    transition: background-color .2s ease-in-out;
    filter: drop-shadow(0 0 .75rem white)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_switchLayer__T81bw .__02-Operator_switcher3d__I_Eai.__02-Operator_active__5YfL8 {
    background-color: rgba(0,0,0,.7)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_switchLayer__T81bw .__02-Operator_switcher3d__I_Eai.__02-Operator_active__5YfL8:before {
    content: "3D";
    transform: translate3d(-50%,.375rem,0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_pcContainer___7vsU .__02-Operator_switchLayer__T81bw .__02-Operator_switcher3d__I_Eai:before {
    content: "2D";
    position: absolute;
    left: 50%;
    transform: translate3d(-50%,3.125rem,0);
    width: 3.75rem;
    height: 3.75rem;
    box-sizing: border-box;
    border-radius: 50%;
    background-color: #e6e6e6;
    border: 3px solid #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: SpaceGrotesk;
    font-size: 1.25rem;
    font-weight: 400;
    box-shadow: 0 0 .5rem 0 rgba(0,0,0,.5);
    transition: transform .2s ease-in-out
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_illustLayer__L4SHB {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_illustLayer__L4SHB .__02-Operator_switcher__vxshb {
    position: absolute;
    top: 8.8125rem;
    left: calc(50% - 71.875rem + 3.75rem)
}

@media(orientation: portrait) {
    .__02-Operator_sectionContainer__D66c4 .__02-Operator_illustLayer__L4SHB .__02-Operator_switcher__vxshb {
        top:unset;
        bottom: 10.5625rem;
        left: calc(50% - 27.125rem - .5625rem)
    }
}

@media(orientation: landscape) {
    .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 {
        display:none
    }
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX {
    position: absolute;
    left: calc(50% - 26.5625rem);
    top: 2.5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN {
    width: 8.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: Novecentosanswide-DemiBold
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_leftBracket__MSSfG,.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_rightBracket__YpY2O {
    color: #999;
    font-size: 1.375rem;
    line-height: 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoText__3RgCN .__02-Operator_title__Qc2kT {
    font-size: 1.5625rem;
    line-height: 1;
    color: #191919
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_headerDeco__LZ5YX .__02-Operator_decoTextIcon__KoX_N {
    position: absolute;
    left: 9.6875rem;
    top: .3125rem;
    width: 10rem;
    height: auto;
    color: #999
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_backgroundDeco___Hj3d .__02-Operator_shallowBg__E2XaH {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: calc(100% - 25.3125rem);
    background-size: 12.8125rem 12.8125rem;
    background-position: 50%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/block-bg.f05eda37.svg);
    opacity: .05
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_backgroundDeco___Hj3d .__02-Operator_decoText__3RgCN {
    position: absolute;
    margin-left: -1.5rem;
    left: calc(50% + 5.1875rem);
    top: -23rem;
    height: 21.5625rem;
    font-family: Novecentosanswide-Bold;
    -webkit-background-clip: text;
    background-clip: text;
    color: rgba(0,0,0,0);
    font-size: 26rem;
    line-height: .58;
    letter-spacing: -.08em;
    transform: rotate(90deg);
    transform-origin: left bottom
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_backgroundDeco___Hj3d .__02-Operator_whiteCover__KkTza {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 26.625rem;
    background-color: #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_backgroundDeco___Hj3d .__02-Operator_whiteCover__KkTza:after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    height: 24.0625rem;
    width: 100%;
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,black 0,black 36.0487470721%,transparent 0,transparent 63.9512529279%,black 0,black 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    -webkit-mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0));
    mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0));
    opacity: .05;
    background-size: .75rem .75rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 85.1875rem;
    overflow: hidden;
    z-index: 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U {
    position: absolute;
    padding-bottom: 20rem;
    top: 72.0625rem;
    width: 100%;
    background-color: #fff;
    transition: transform .4s ease-in-out
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U.__02-Operator_active__5YfL8 {
    transform: translateY(-18.5rem)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck {
    position: relative;
    height: 12.375rem;
    padding: 0 calc(50% - 27.125rem)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck:before {
    content: "";
    position: absolute;
    top: 0;
    width: 54.25rem;
    height: 100%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/tape-wave-bg.2bce9fc0.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x {
    position: absolute;
    top: 1.1875rem;
    display: flex;
    height: 3.75rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC {
    width: 3.75rem;
    height: 3.75rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=fire] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-fire.97dcd67b.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=ice] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-ice.134e8d15.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=electric] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-electric.a3874677.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=physic] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-physic.2c205b7a.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=nature] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ele-nature.0606ebde.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=assault] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-assault.2aeeaf48.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=caster] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-caster.d469c805.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=guard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-guard.78502de4.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=shielder] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-shielder.a3c6ffc9.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=support] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-support.532f02bd.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_icons__Ntn1x .__02-Operator_icon__GnwPC[data-key=vanguard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/prof-vanguard.b957cec2.jpg)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_decoLine___SBw8 {
    position: absolute;
    left: calc(50% - 27.125rem + 8.25rem);
    top: 3.25rem;
    width: 46.125rem;
    height: .5rem;
    background-image: linear-gradient(90deg,#bfbfbf 1.25rem,transparent 0,transparent 10.4375rem,#bfbfbf 0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_decoLine___SBw8 .__02-Operator_decoLineIcon__C5C_n {
    position: absolute;
    left: 1.75rem;
    top: 50%;
    transform: translateY(-50%);
    height: 1.1875rem;
    width: auto;
    color: #bfbfbf;
    -webkit-clip-path: polygon(0 0,8.125rem 0,8.125rem 100%,0 100%);
    clip-path: polygon(0 0,8.125rem 0,8.125rem 100%,0 100%)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE {
    position: absolute;
    top: 6rem;
    line-height: 1;
    display: flex;
    gap: 3.25rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_leftBracket__MSSfG,.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_rightBracket__YpY2O {
    color: #999;
    font-family: SansMedium;
    font-size: 4.875rem;
    line-height: 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_title__Qc2kT {
    font-family: SansBold;
    font-size: 4.875rem;
    line-height: 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE.__02-Operator_small__PSfAP {
    top: 7rem;
    gap: 2.5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE.__02-Operator_small__PSfAP .__02-Operator_leftBracket__MSSfG,.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE.__02-Operator_small__PSfAP .__02-Operator_rightBracket__YpY2O,.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE.__02-Operator_small__PSfAP .__02-Operator_title__Qc2kT {
    font-size: 4rem
}

@media(orientation: portrait) {
    html[lang=ru-ru] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE {
        gap:1.5rem
    }

    html[lang=ru-ru] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_leftBracket__MSSfG,html[lang=ru-ru] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_rightBracket__YpY2O,html[lang=ru-ru] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameContainer__yjlQE .__02-Operator_title__Qc2kT {
        font-size: 3.75rem
    }
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_nameEnContainer___LIcI {
    position: absolute;
    right: calc(50% - 27.125rem);
    top: 6.625rem;
    width: 14.5rem;
    height: 1.375rem;
    background-color: #d9d9d9;
    color: #191919;
    font-family: Gilroy-Medium;
    font-size: 1rem;
    line-height: 1.25rem;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    padding: .25rem .5rem 0
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_stars__ebGpw {
    position: absolute;
    right: calc(50% - 27.125rem);
    top: 8.3125rem;
    display: flex;
    gap: 2px
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_stars__ebGpw .__02-Operator_star__2BUbj {
    width: 2.375rem;
    height: 2.625rem;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/star.c078a0a7.png)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_header__cBZck .__02-Operator_deco___QyYC {
    position: absolute;
    bottom: 0;
    width: 54.375rem;
    height: .25rem;
    background-image: linear-gradient(90deg,#ff00f0 11.6875rem,#fffa00 0,#fffa00 23.25rem,#00ffa2 0)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detailButton__4n7SU {
    position: absolute;
    top: -7.4375rem;
    right: calc(50% - 27.125rem);
    width: 5.4375rem;
    height: 5.4375rem;
    border-radius: 50%;
    padding: .5rem;
    box-sizing: border-box;
    border: 2px solid hsla(0,0%,40%,.7);
    background-color: rgba(0,0,0,.7);
    box-shadow: 0 0 1rem hsla(0,0%,100%,.8)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detailButton__4n7SU .__02-Operator_inner__rzAAE {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 4.25rem;
    height: 4.25rem;
    border: 2px solid #333;
    border-radius: 50%;
    background-color: #e5e5e5;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/pag-button-texture.e4e732ad.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detailButton__4n7SU .__02-Operator_closeIcon__h13_B {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 2.625rem;
    height: 2.625rem;
    color: #3d3d3d
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_switcher3d__I_Eai {
    position: absolute;
    left: calc(50% - 27.125rem);
    top: -7.4375rem;
    height: 5.5rem;
    width: 10rem;
    padding: .3125rem;
    box-sizing: border-box;
    display: flex;
    gap: .5rem;
    align-items: center;
    border: 2px solid hsla(0,0%,40%,.7);
    background-color: rgba(0,0,0,.7);
    border-radius: 2.75rem;
    box-shadow: 0 0 1rem hsla(0,0%,100%,.8);
    transition: opacity .2s ease
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_switcher3d__I_Eai.__02-Operator_active__5YfL8:before {
    content: "3D";
    transform: translateX(4.4375rem)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_switcher3d__I_Eai:before {
    content: "2D";
    position: relative;
    width: 4.625rem;
    height: 4.625rem;
    border-radius: 50%;
    box-sizing: border-box;
    background-color: #e5e5e5;
    border: 2px solid #333;
    font-family: SpaceGrotesk;
    font-size: 1.75rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3d3d3d;
    transition: transform .2s ease-in-out
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_switcher3d__I_Eai.__02-Operator_hidden__9OxMF {
    opacity: 0;
    pointer-events: none
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT {
    position: relative;
    margin-top: 1.125rem;
    padding: 0 calc(50% - 27.125rem)
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tagContainer__dKENE {
    height: 2.375rem;
    display: flex;
    gap: 2.5rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tag__FQrt0 {
    height: 100%;
    flex: 1 1;
    font-size: 1.875rem;
    line-height: 2.625rem;
    font-family: SansMedium;
    display: flex
}

html[data-oversea=true] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tag__FQrt0:first-of-type {
    flex: 1.6 1
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tag__FQrt0 .__02-Operator_label__3koYX {
    padding: 0 1.5rem;
    background-color: #191919;
    color: #fff
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tag__FQrt0 .__02-Operator_value__w_bbs {
    background-color: #f2f2f2;
    color: #191919;
    flex: 1 1;
    text-align: center
}

html[data-oversea=true] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_tag__FQrt0 .__02-Operator_value__w_bbs {
    padding: 0 .75rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_detail__yB6fT {
    margin-top: 1.5rem;
    height: 13.75rem;
    font-size: 1.875rem;
    text-align: justify
}

html[data-oversea=true] .__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_detail__yB6fT {
    text-align: unset
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_drawerWrapper__gYsbO .__02-Operator_contentContainer__4GC_U .__02-Operator_detail__yB6fT .__02-Operator_detail__yB6fT .__02-Operator_line__XUiut:not(:first-child) {
    margin-top: 2rem
}

.__02-Operator_sectionContainer__D66c4 .__02-Operator_h5Container__KAmr7 .__02-Operator_index__2PakN {
    position: absolute;
    left: 50%;
    bottom: 5.3125rem;
    transform: translateX(-50%);
    width: 9.6875rem;
    height: 2.875rem;
    font-size: 1.3125rem;
    border-radius: 1.4375rem;
    font-family: Gilroy-Medium;
    color: #191919;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f2f2f2
}

.__02-Operator_operatorSwitcher__mVB3Y {
    position: relative;
    width: 9.8125rem;
    height: 60.875rem;
    padding: 4.875rem 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y {
        width:55.5rem;
        height: 10.625rem;
        flex-direction: row;
        justify-content: space-between;
        padding: 0
    }
}

.__02-Operator_operatorSwitcher__mVB3Y:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    -webkit-mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0) 20%,rgb(0,0,0) 80%,rgba(0,0,0,0));
    mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0) 20%,rgb(0,0,0) 80%,rgba(0,0,0,0));
    background-image: linear-gradient(-45deg,transparent,transparent 13.9512529279%,black 0,black 36.0487470721%,transparent 0,transparent 63.9512529279%,black 0,black 86.0487470721%,transparent 0,transparent);
    background-size: .5rem .5rem;
    background-repeat: repeat;
    opacity: .08
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y:before {
        width:67.5rem;
        -webkit-mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) 21.25rem,rgb(0,0,0) 46.25rem,rgba(0,0,0,0));
        mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) 21.25rem,rgb(0,0,0) 46.25rem,rgba(0,0,0,0));
        background-size: .75rem .75rem;
        opacity: .05
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ {
    position: relative;
    width: 4.625rem;
    height: 4.625rem;
    border-radius: 2.3125rem;
    background-color: #fafafa;
    box-shadow: 0 0 .625rem rgba(2,2,2,.3);
    cursor: pointer;
    transition: background-color .2s ease
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_top__2CdWE .__02-Operator_arrow__CeR6Q {
    transform: translateY(-50%) rotate(90deg)
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_top__2CdWE .__02-Operator_arrow__CeR6Q {
        transform:translateY(-50%)
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_bottom__R8cW0 .__02-Operator_arrow__CeR6Q {
    transform: translateY(-50%) rotate(-90deg)
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_bottom__R8cW0 .__02-Operator_arrow__CeR6Q {
        transform:translate3d(.25rem,-50%,0) rotate(180deg)
    }

    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ {
        width: 5.25rem;
        height: 5.25rem;
        border-radius: 2.625rem;
        box-shadow: 0 0 .625rem rgba(2,2,2,.3)
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/pag-button-texture.e4e732ad.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    opacity: .4;
    transition: opacity .2s ease
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_disabled___VWxP {
    cursor: not-allowed;
    pointer-events: none
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_.__02-Operator_disabled___VWxP .__02-Operator_arrow__CeR6Q {
    color: #aaa
}

@media(any-hover: hover) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_:not(.__02-Operator_disabled___VWxP):hover {
        background-color:#fffa00
    }

    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_:not(.__02-Operator_disabled___VWxP):hover:before {
        opacity: 1
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_:not(.__02-Operator_disabled___VWxP):active {
    background-color: #eeea00
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ .__02-Operator_border__rjZXw {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ .__02-Operator_border__rjZXw:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: .375rem solid #e6e6e6;
    box-sizing: border-box
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ .__02-Operator_border__rjZXw:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: .25rem solid #fff;
    box-sizing: border-box
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ .__02-Operator_arrow__CeR6Q {
    position: absolute;
    left: 1.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.125rem;
    height: 1.6875rem;
    color: #3c3c3c;
    transition: color .2s ease
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_button__m3eA_ .__02-Operator_arrow__CeR6Q {
        left:2rem
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G {
    position: absolute;
    left: -50%;
    top: 0;
    margin: 9.75rem 0;
    padding: .625rem 0;
    width: 200%;
    height: 40.5rem;
    -webkit-mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0) .625rem,rgb(0,0,0) calc(100% - .625rem),rgba(0,0,0,0));
    mask-image: linear-gradient(180deg,rgba(0,0,0,0) 0,rgb(0,0,0) .625rem,rgb(0,0,0) calc(100% - .625rem),rgba(0,0,0,0));
    display: flex;
    flex-direction: column;
    align-items: center
}

@media(orientation: portrait) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G {
        top:-25%;
        left: 50%;
        width: 45.125rem;
        height: 150%;
        margin: 0;
        padding: 0 .625rem;
        box-sizing: border-box;
        transform: translateX(-50%);
        flex-direction: row;
        -webkit-mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) .625rem,rgb(0,0,0) calc(100% - .625rem),rgba(0,0,0,0));
        mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,rgb(0,0,0) .625rem,rgb(0,0,0) calc(100% - .625rem),rgba(0,0,0,0))
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ {
    position: absolute;
    height: 8.5rem;
    width: 8.5rem;
    border-radius: 50%;
    box-sizing: border-box;
    box-shadow: 0 0 .75rem rgba(2,2,2,.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    color: #fff;
    transition: transform .3s ease-in-out;
    cursor: pointer
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ.__02-Operator_active__5YfL8 .__02-Operator_activeBg__f2spf {
    opacity: 1
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ.__02-Operator_active__5YfL8 .__02-Operator_border__rjZXw {
    border-color: #fffa00;
    border-width: 2px
}

@media(any-hover: hover) {
    .__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ:hover .__02-Operator_border__rjZXw {
        border-color:#fffa00;
        border-width: 2px
    }
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_border__rjZXw {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #f2f2f2;
    box-sizing: border-box;
    transition: border-color .3s ease-in-out
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_activeBg__f2spf {
    position: absolute;
    color: #ccc;
    width: 12.5rem;
    height: 12.5rem;
    opacity: 0;
    transition: opacity .3s ease-in-out;
    pointer-events: none
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e {
    height: 7.5rem;
    width: 7.5rem;
    border-radius: 50%;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: cover;
    background-color: hsla(0,0%,100%,.5)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=endministrator1] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/endministrator1.3efd4769.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=endministrator2] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/endministrator2.f0bbf4fa.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=perlica] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/perlica.871dcf57.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=chen] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/chen.5c7b5e46.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=laevatain] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/laevatain.20075757.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=yvonne] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/yvonne.c93412e1.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=gilberta] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/gilberta.07ff3560.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=ardelia] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ardelia.b46cd31c.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=ember] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ember.235ca9f1.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=lastrite] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/lastrite.8560c002.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=lifeng] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/lifeng.41ae5d06.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=pogranichnik] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/pogranichnik.73f7bcf6.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=alesh] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/alesh.ca99268b.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=arclight] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/arclight.0b402b3e.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=avywenna] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/avywenna.36c72367.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=dapan] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/dapan.7b5afdec.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=snowshine] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/snowshine.844ed0a4.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=wulfgard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/wulfgard.b9d580b2.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=xaihi] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/xaihi.9c949014.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=akekuri] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/akekuri.3df4a3dc.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=antal] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/antal.78d45318.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=catcher] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/catcher.68b395f9.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=estella] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/estella.b761d517.png)
}

.__02-Operator_operatorSwitcher__mVB3Y .__02-Operator_itemContainer__1m60G .__02-Operator_switchItem__GlihQ .__02-Operator_image__brh4e[data-key=fluorite] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/fluorite.b83d45cf.png)
}

.__02-Operator_illustrationContainer__1Ubvh {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh {
        -webkit-clip-path:polygon(0 0,100% 0,100% 85rem,0 85rem);
        clip-path: polygon(0 0,100% 0,100% 85rem,0 85rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3 {
    position: absolute;
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    opacity: 0
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator1] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/endministrator1.ec409283.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator1] {
        width:95.625rem;
        height: 110.9375rem;
        left: calc(50% - 22.8125rem);
        top: calc(50% - 57.875rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator1] {
        width:78rem;
        height: 90.5625rem;
        left: calc(50% - 39.75rem);
        top: calc(50% - 66.5625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator2] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/endministrator2.1ec20a16.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator2] {
        width:95.625rem;
        height: 110.9375rem;
        left: calc(50% - 21.75rem);
        top: calc(50% - 57.9375rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=endministrator2] {
        width:78rem;
        height: 90.5625rem;
        left: calc(50% - 39.75rem);
        top: calc(50% - 66.5625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=perlica] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/perlica.b24be972.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=perlica] {
        width:105rem;
        height: 101.4375rem;
        left: calc(50% - 32.4375rem);
        top: calc(50% - 54.5625rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=perlica] {
        width:93.875rem;
        height: 95.1875rem;
        left: calc(50% - 49.4375rem);
        top: calc(50% - 72.125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=chen] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/chen.2a091fd4.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=chen] {
        width:105.875rem;
        height: 94.6875rem;
        left: calc(50% - 32.3125rem);
        top: calc(50% - 51.125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=chen] {
        width:99.6875rem;
        height: 88.9375rem;
        left: calc(50% - 53.5625rem);
        top: calc(50% - 68.6875rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=laevatain] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/laevatain.d0ca2837.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=laevatain] {
        width:112.5rem;
        height: 122.8125rem;
        left: calc(50% - 25.8125rem);
        top: calc(50% - 56rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=laevatain] {
        width:103.1875rem;
        height: 112.625rem;
        left: calc(50% - 47rem);
        top: calc(50% - 69.0625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=yvonne] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/yvonne.a74396e6.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=yvonne] {
        width:96.8125rem;
        height: 104.25rem;
        left: calc(50% - 26.25rem);
        top: calc(50% - 57.125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=yvonne] {
        width:96.8125rem;
        height: 104.25rem;
        left: calc(50% - 49.6875rem);
        top: calc(50% - 75.375rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=gilberta] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/gilberta.92aa17d4.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=gilberta] {
        width:105.25rem;
        height: 101.75rem;
        left: calc(50% - 29.875rem);
        top: calc(50% - 49.125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=gilberta] {
        width:99.25rem;
        height: 95.875rem;
        left: calc(50% - 50.375rem);
        top: calc(50% - 61.75rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ardelia] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ardelia.36d836c7.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ardelia] {
        width:109.6875rem;
        height: 96.375rem;
        left: calc(50% - 31.3125rem);
        top: calc(50% - 44.375rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ardelia] {
        width:111.625rem;
        height: 92.3125rem;
        left: calc(50% - 59.625rem);
        top: calc(50% - 61.3125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ember] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/ember.4f967a14.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ember] {
        width:136.875rem;
        height: 100.375rem;
        left: calc(50% - 40.875rem);
        top: calc(50% - 52.5rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=ember] {
        width:128rem;
        height: 93.875rem;
        left: calc(50% - 66.5rem);
        top: calc(50% - 71.3125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lastrite] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/lastrite.c66bd542.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lastrite] {
        width:117.125rem;
        height: 120.625rem;
        left: calc(50% - 34.375rem);
        top: calc(50% - 66.8125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lastrite] {
        width:106.8125rem;
        height: 110.0625rem;
        left: calc(50% - 49.125rem);
        top: calc(50% - 80.625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lifeng] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/lifeng.7253579c.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lifeng] {
        width:112.625rem;
        height: 109.9375rem;
        left: calc(50% - 30.75rem);
        top: calc(50% - 59.125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=lifeng] {
        width:102.375rem;
        height: 99.9375rem;
        left: calc(50% - 48.6875rem);
        top: calc(50% - 75.5625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=pogranichnik] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/pogranichnik.6983f122.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=pogranichnik] {
        width:128.8125rem;
        height: 94.8125rem;
        left: calc(50% - 35.875rem);
        top: calc(50% - 53rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=pogranichnik] {
        width:114rem;
        height: 83.875rem;
        left: calc(50% - 50.6875rem);
        top: calc(50% - 67.3125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=alesh] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/alesh.bfe6a583.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=alesh] {
        width:108rem;
        height: 95.625rem;
        left: calc(50% - 27.5rem);
        top: calc(50% - 47rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=alesh] {
        width:105.875rem;
        height: 93.75rem;
        left: calc(50% - 49.4375rem);
        top: calc(50% - 63.3125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=arclight] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/arclight.f1d9853c.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=arclight] {
        width:111.75rem;
        height: 87.6875rem;
        left: calc(50% - 32.6875rem);
        top: calc(50% - 39.6875rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=arclight] {
        width:99.75rem;
        height: 78.1875rem;
        left: calc(50% - 51.3125rem);
        top: calc(50% - 55.25rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=avywenna] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/avywenna.3346feee.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=avywenna] {
        width:96.4375rem;
        height: 96.125rem;
        left: calc(50% - 23.1875rem);
        top: calc(50% - 47.3125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=avywenna] {
        width:90.1875rem;
        height: 89.75rem;
        left: calc(50% - 42.625rem);
        top: calc(50% - 67.8125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=dapan] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/dapan.6118e704.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=dapan] {
        width:106.375rem;
        height: 121.9375rem;
        left: calc(50% - 32.375rem);
        top: calc(50% - 62.25rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=dapan] {
        width:99.6875rem;
        height: 114.4375rem;
        left: calc(50% - 54.1875rem);
        top: calc(50% - 78.6875rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=snowshine] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/snowshine.1f6d3a0e.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=snowshine] {
        width:92.5rem;
        height: 91.0625rem;
        left: calc(50% - 15.4375rem);
        top: calc(50% - 45rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=snowshine] {
        width:86.5rem;
        height: 84.5rem;
        left: calc(50% - 37.875rem);
        top: calc(50% - 59.9375rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=wulfgard] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/wulfgard.53a6686b.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=wulfgard] {
        width:116.75rem;
        height: 103.9375rem;
        left: calc(50% - 36.0625rem);
        top: calc(50% - 47.625rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=wulfgard] {
        width:105.375rem;
        height: 93.8125rem;
        left: calc(50% - 53.125rem);
        top: calc(50% - 63.25rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=xaihi] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/xaihi.43d608d9.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=xaihi] {
        width:110.0625rem;
        height: 103.8125rem;
        left: calc(50% - 30.75rem);
        top: calc(50% - 55.0625rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=xaihi] {
        width:92.125rem;
        height: 86.875rem;
        left: calc(50% - 42.4375rem);
        top: calc(50% - 66.4375rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=akekuri] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/akekuri.8678d37f.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=akekuri] {
        width:78.8125rem;
        height: 84.9375rem;
        left: calc(50% - 22.4375rem);
        top: calc(50% - 44.6875rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=akekuri] {
        width:70.3125rem;
        height: 75.75rem;
        left: calc(50% - 40.9375rem);
        top: calc(50% - 60.5625rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=antal] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/antal.51fa71d3.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=antal] {
        width:64.75rem;
        height: 85.625rem;
        left: calc(50% - 14.5625rem);
        top: calc(50% - 42.8125rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=antal] {
        width:57.3125rem;
        height: 75.8125rem;
        left: calc(50% - 30.5rem);
        top: calc(50% - 56.875rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=catcher] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/catcher.3812760d.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=catcher] {
        width:53.3125rem;
        height: 89.5rem;
        left: calc(50% + 4.3125rem);
        top: calc(50% - 46.625rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=catcher] {
        width:46.25rem;
        height: 77.8125rem;
        left: calc(50% - 17.5625rem);
        top: calc(50% - 59.6875rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=estella] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/estella.fbad0dc2.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=estella] {
        width:68.75rem;
        height: 93.375rem;
        left: calc(50% - 15rem);
        top: calc(50% - 45.5625rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=estella] {
        width:62.6875rem;
        height: 85.25rem;
        left: calc(50% - 31.375rem);
        top: calc(50% - 62.875rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=fluorite] {
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/fluorite.9071d26e.png)
}

@media(orientation: landscape) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=fluorite] {
        width:72.1875rem;
        height: 79rem;
        left: calc(50% - 16.125rem);
        top: calc(50% - 38.25rem)
    }
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_illustration__aCtw3[data-key=fluorite] {
        width:63.8125rem;
        height: 69.875rem;
        left: calc(50% - 32.0625rem);
        top: calc(50% - 53.3125rem)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_video__wMiK7 {
    position: absolute;
    top: 0;
    left: calc(50% - 49.4375rem - 3.75rem + 75.625rem - 80rem);
    width: 160rem;
    height: 90rem;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,black 10%,black 90%,rgba(0,0,0,0));
    mask-image: linear-gradient(90deg,rgba(0,0,0,0) 0,black 10%,black 90%,rgba(0,0,0,0))
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_video__wMiK7 {
        left:50%;
        top: 40%;
        transform: translate3d(-50%,-50%,0)
    }
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_videoContainer__8Cx6H {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_videoEleContainer__o7Swk {
    opacity: 0
}

.__02-Operator_illustrationContainer__1Ubvh .__02-Operator_loadingContainer__XM2OO {
    position: absolute;
    top: calc(50% + 4rem);
    left: calc(50% + 24rem);
    transform: translate(-50%,-50%);
    width: 26.875rem;
    height: 23.25rem;
    background-image: url(https://web.hycdn.cn/endfield/official-v4/_next/static/media/endfield.bcc6fe39.png);
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    opacity: 0
}

@media(orientation: portrait) {
    .__02-Operator_illustrationContainer__1Ubvh .__02-Operator_loadingContainer__XM2OO {
        top:calc(50% - 14rem);
        left: 50%
    }
}

.__02-Operator_animEle__16Ovp {
    opacity: 0
}

.__02-Operator_noDisplay__lYJM1 {
    display: none!important;
    pointer-events: none!important
}
