import { clsx, type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge";
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}
export const money=(v:number,currency="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:2}).format(v);
export const pct=(v:number)=>`${v>=0?"+":""}${v.toFixed(2)}%`;
