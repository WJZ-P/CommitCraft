"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

function useCopyToClipboard(url: string) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
    document.body.removeChild(textArea);
  }, [url]);

  return { copied, handleCopy };
}

export default function EndpointCopyBox({ url, label }: { url: string; label?: string }) {
  const t = useTranslations("components");
  const { copied, handleCopy } = useCopyToClipboard(url);

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      <div className="flex items-center">
        <label
          className="text-[#3f3f3f] font-bold text-lg tracking-wide"
          style={{ textShadow: "1px 1px 0px #fff" }}
        >
          {label ? t("endpointLabel", { label }) : t("endpointDefault")}
        </label>
      </div>

      <button
        onClick={handleCopy}
        className={`
          group relative w-full h-14 flex items-center justify-between px-4
          border-4 border-black font-mono transition-none outline-none cursor-pointer
          ${copied
            ? "bg-[#707070] shadow-[inset_4px_4px_0_0_#373737,inset_-4px_-4px_0_0_#a0a0a0]"
            : "bg-[#8b8b8b] hover:bg-[#9c9c9c] shadow-[inset_4px_4px_0_0_#c6c6c6,inset_-4px_-4px_0_0_#555555] active:bg-[#707070] active:shadow-[inset_4px_4px_0_0_#373737,inset_-4px_-4px_0_0_#a0a0a0]"
          }
        `}
      >
        <div
          className={`
            flex w-full items-center justify-between overflow-hidden
            ${copied ? "translate-y-[2px] translate-x-[2px]" : "group-active:translate-y-[2px] group-active:translate-x-[2px]"}
          `}
        >
          <span
            className="font-mono text-xl text-white truncate pr-4 tracking-wide"
            style={{ textShadow: "2px 2px 0px #3f3f3f" }}
          >
            {url}
          </span>

          <span
            className={`
              flex-shrink-0 font-bold text-xl tracking-widest
              ${copied ? "text-[#ffff55]" : "text-white"}
            `}
            style={{ textShadow: "2px 2px 0px #3f3f3f" }}
          >
            {copied ? t("copied") : t("copy")}
          </span>
        </div>
      </button>

    </div>
  );
}
