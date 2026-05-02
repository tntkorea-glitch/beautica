"use client";

import { useEffect, useState } from "react";

export type BankCode =
  | "kb" | "shinhan" | "woori" | "hana" | "nh"
  | "ibk" | "kakao" | "toss" | "k" | "saemaul" | "busan" | "daegu";

type BankInfo = {
  name: string;
  webUrl: string;       // PC 인터넷뱅킹
  appSchemeIos: string; // iOS 커스텀 스킴
  appSchemeAnd: string; // Android intent URL
};

const BANKS: Record<BankCode, BankInfo> = {
  kb: {
    name: "국민은행",
    webUrl: "https://obank.kbstar.com",
    appSchemeIos: "kbbank://",
    appSchemeAnd: "intent://com.kbstar.kbbank#Intent;scheme=kbbank;package=com.kbstar.kbbank;end",
  },
  shinhan: {
    name: "신한은행",
    webUrl: "https://www.shinhan.com/hpe/index.jsp",
    appSchemeIos: "shinhan://",
    appSchemeAnd: "intent://com.shinhan.sbanking#Intent;scheme=shinhan;package=com.shinhan.sbanking;end",
  },
  woori: {
    name: "우리은행",
    webUrl: "https://www.wooribank.com",
    appSchemeIos: "turbankand://",
    appSchemeAnd: "intent://com.wooribank.smart.won#Intent;scheme=turbankand;package=com.wooribank.smart.won;end",
  },
  hana: {
    name: "하나은행",
    webUrl: "https://www.hanabank.com",
    appSchemeIos: "hanabank://",
    appSchemeAnd: "intent://com.kebhana.hanapay#Intent;scheme=hanabank;package=com.kebhana.hanapay;end",
  },
  nh: {
    name: "NH농협",
    webUrl: "https://banking.nonghyup.com",
    appSchemeIos: "nhallonebank://",
    appSchemeAnd: "intent://com.nonghyup.allonebank#Intent;scheme=nhallonebank;package=com.nonghyup.allonebank;end",
  },
  ibk: {
    name: "IBK기업은행",
    webUrl: "https://www.ibk.co.kr",
    appSchemeIos: "ibkbank://",
    appSchemeAnd: "intent://com.ibk.android.ibkdirectbank#Intent;scheme=ibkbank;package=com.ibk.android.ibkdirectbank;end",
  },
  kakao: {
    name: "카카오뱅크",
    webUrl: "https://www.kakaobank.com",
    appSchemeIos: "kakaobank://",
    appSchemeAnd: "intent://com.kakaobank.channel#Intent;scheme=kakaobank;package=com.kakaobank.channel;end",
  },
  toss: {
    name: "토스뱅크",
    webUrl: "https://www.tossbank.com",
    appSchemeIos: "supertoss://",
    appSchemeAnd: "intent://viva.republica.toss#Intent;scheme=supertoss;package=viva.republica.toss;end",
  },
  k: {
    name: "케이뱅크",
    webUrl: "https://www.kbanknow.com",
    appSchemeIos: "kbanknow://",
    appSchemeAnd: "intent://com.kbanknow.android.kbankapp#Intent;scheme=kbanknow;package=com.kbanknow.android.kbankapp;end",
  },
  saemaul: {
    name: "새마을금고",
    webUrl: "https://www.kfcc.co.kr",
    appSchemeIos: "mgobank://",
    appSchemeAnd: "intent://com.kfcc.mgobank#Intent;scheme=mgobank;package=com.kfcc.mgobank;end",
  },
  busan: {
    name: "부산은행",
    webUrl: "https://www.busanbank.co.kr",
    appSchemeIos: "busanbank://",
    appSchemeAnd: "intent://com.busanbank.bsmobilebank#Intent;scheme=busanbank;package=com.busanbank.bsmobilebank;end",
  },
  daegu: {
    name: "대구은행",
    webUrl: "https://www.dgb.co.kr",
    appSchemeIos: "dgbmobile://",
    appSchemeAnd: "intent://com.dgb.app.android.dgbmobilebank#Intent;scheme=dgbmobile;package=com.dgb.app.android.dgbmobilebank;end",
  },
};

export function BankLinks({ bankCode }: { bankCode: BankCode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
    setIsAndroid(/Android/i.test(ua));
  }, []);

  const bank = BANKS[bankCode];
  if (!bank) return null;

  const appHref = isAndroid ? bank.appSchemeAnd : bank.appSchemeIos;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {isMobile ? (
        <a
          href={appHref}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
        >
          📱 {bank.name} 앱으로 이체하기
        </a>
      ) : (
        <a
          href={bank.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
        >
          🏦 {bank.name} 인터넷뱅킹
        </a>
      )}
      {/* 모바일에서도 웹 링크 보조 제공 */}
      {isMobile && (
        <a
          href={bank.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-xs text-gray-400 underline underline-offset-2"
        >
          앱이 없으면 웹으로 이동
        </a>
      )}
    </div>
  );
}

export { BANKS };
