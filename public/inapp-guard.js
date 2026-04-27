// inapp-guard.js
// 카카오톡/네이버/인스타/페북/라인 등 인앱 브라우저(WebView)에서
// 외부 브라우저로 강제 이동시키는 가드. <head>에 가능한 한 일찍 로드.
(function () {
  try {
    var ua = (navigator.userAgent || '').toLowerCase();
    var isKakao    = /kakaotalk/i.test(ua);
    var isNaver    = /naver\(inapp/i.test(ua) || (/naver/i.test(ua) && /inapp/i.test(ua));
    var isInsta    = /instagram/i.test(ua);
    var isFacebook = /fban|fbav/i.test(ua);
    var isLine     = /line\//i.test(ua);
    var isInApp    = isKakao || isNaver || isInsta || isFacebook || isLine;
    if (!isInApp) return;

    // 전역으로 인앱 상태 노출 (다른 스크립트에서 참조 가능)
    window.__IS_INAPP__ = true;
    window.__INAPP_TYPE__ = isKakao ? 'kakao' : isNaver ? 'naver' : isInsta ? 'instagram' : isFacebook ? 'facebook' : 'line';

    var isAndroid = /android/i.test(ua);
    var isIOS     = /iphone|ipad|ipod/i.test(ua);
    var target    = location.href;

    // 1) 카카오톡: 공식 외부 이동 스킴
    if (isKakao) {
      location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(target);
    }
    // 2) 안드로이드 + 그 외 인앱: Chrome intent로 시도
    else if (isAndroid) {
      var clean = target.replace(/^https?:\/\//, '');
      location.href = 'intent://' + clean + '#Intent;scheme=https;package=com.android.chrome;end';
    }

    // 앱 이름 매핑
    var appName = isKakao ? '카카오톡' : isNaver ? '네이버' : isInsta ? '인스타그램' : isFacebook ? '페이스북' : '라인';

    // 3) Fallback 안내 오버레이 (자동 이동 실패 시)
    var showOverlay = function () {
      if (document.getElementById('__inapp_guard__')) return;

      var guideText = '';
      if (isKakao) {
        guideText = '오른쪽 상단 <b>⋮</b> 메뉴 → <b>다른 브라우저로 열기</b>';
      } else if (isNaver) {
        guideText = '오른쪽 하단 <b>⋮</b> 메뉴 → <b>브라우저로 열기</b>';
      } else if (isIOS) {
        guideText = '하단 공유 버튼 → <b>Safari로 열기</b>';
      } else {
        guideText = '메뉴(⋮)에서 <b>Chrome으로 열기</b> 또는 <b>외부 브라우저로 열기</b>';
      }

      var overlay = document.createElement('div');
      overlay.id = '__inapp_guard__';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f0c29;color:#fff;font-family:-apple-system,"Pretendard Variable",sans-serif;display:flex;align-items:center;justify-content:center;padding:24px;';
      overlay.innerHTML = ''
        + '<div style="max-width:380px;width:100%;text-align:center;line-height:1.6;">'
        + '<div style="font-size:42px;margin-bottom:12px;">🌐</div>'
        + '<h2 style="font-size:1.15rem;font-weight:800;margin:0 0 8px;">외부 브라우저에서 열어주세요</h2>'
        + '<p style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin:0 0 16px;">' + appName + ' 앱 내에서는 구글 로그인이 제한됩니다</p>'
        + '<div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:20px;text-align:left;">'
        + '<p style="font-size:0.85rem;color:rgba(255,255,255,0.9);margin:0;">' + guideText + '</p>'
        + '</div>'
        + '<button id="__inapp_copy__" style="display:block;width:100%;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;margin-bottom:10px;">링크 복사하기</button>'
        + '<button id="__inapp_close__" style="display:block;width:100%;padding:12px;border:1px solid rgba(255,255,255,0.2);border-radius:10px;background:transparent;color:rgba(255,255,255,0.7);font-size:0.82rem;cursor:pointer;">그래도 계속 보기</button>'
        + '<p style="font-size:0.65rem;color:rgba(255,255,255,0.3);margin-top:14px;word-break:break-all;">' + target + '</p>'
        + '</div>';
      document.body.appendChild(overlay);

      document.getElementById('__inapp_copy__').onclick = function () {
        var btn = this;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(target).then(function () {
            btn.textContent = '✓ 복사 완료! 브라우저에 붙여넣기 하세요';
            btn.style.background = '#059669';
          }, function () {
            prompt('아래 링크를 복사해 외부 브라우저에서 열어주세요', target);
          });
        } else {
          prompt('아래 링크를 복사해 외부 브라우저에서 열어주세요', target);
        }
      };
      document.getElementById('__inapp_close__').onclick = function () {
        var el = document.getElementById('__inapp_guard__');
        if (el) el.remove();
      };
    };

    // 자동 이동 실패 시 빠르게 오버레이 표시 (500ms)
    if (document.body) {
      setTimeout(showOverlay, 500);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(showOverlay, 500); });
    }
  } catch (e) {
    console.warn('[inapp-guard]', e);
  }
})();
