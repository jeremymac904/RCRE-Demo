export type PaymentInputs={price:number;down:number;rate:number;years:number;taxes:number;insurance:number;hoa:number;mi:number}
export function calculatePayment(v:PaymentInputs){
 if(Object.values(v).some(n=>!Number.isFinite(n)||n<0)||v.price<=0||v.down>v.price||v.years<=0||v.years>50||v.rate>50)throw new Error('Enter a positive price and term, a down payment no higher than the price, and valid nonnegative costs.')
 const principal=v.price-v.down,months=Math.round(v.years*12),r=v.rate/1200
 const principalInterest=principal===0?0:r===0?principal/months:principal*r/(1-Math.pow(1+r,-months))
 const tax=v.taxes/12,insurance=v.insurance/12,total=principalInterest+tax+insurance+v.hoa+v.mi
 return {principal,principalInterest,tax,insurance,total,downPercent:v.down/v.price*100,totalInterest:principalInterest*months-principal}
}
