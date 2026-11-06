export function optionContractDetails(symbol: string, optionType: string, strike: string, expiry: string): string {
 const ticker=symbol.trim().toUpperCase(), price=Number(strike);
 if(!ticker||!strike.trim()||!Number.isFinite(price)||price<=0||!/^\d{4}-\d{2}-\d{2}$/.test(expiry))return "";
 const [y,m,d]=expiry.split("-").map(Number), date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return "";
 return `${optionType.startsWith("sell-")?"Sell":"Buy"} ${ticker} $${price} ${optionType.endsWith("-put")?"Put":"Call"} Exp ${date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}`;
}
