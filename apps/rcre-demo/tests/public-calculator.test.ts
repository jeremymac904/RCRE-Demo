import {describe,it,expect} from 'vitest'
import {calculatePayment,type PaymentInputs} from '../src/lib/public/calculator'
const base:PaymentInputs={price:400000,down:40000,rate:6.5,years:30,taxes:4800,insurance:2400,hoa:75,mi:150}
describe('public mortgage illustration',()=>{
 it('amortizes principal and itemizes annual and monthly ownership inputs without silently excluding mortgage insurance',()=>{const p=calculatePayment(base);expect(p.principal).toBe(360000);expect(p.principalInterest).toBeCloseTo(2275.4449,2);expect(p.total).toBeCloseTo(3100.4449,2);expect(p.downPercent).toBe(10);expect(p.tax).toBe(400);expect(p.insurance).toBe(200)})
 it('handles zero interest without dividing by zero',()=>{expect(calculatePayment({...base,rate:0}).principalInterest).toBe(1000)})
 it('a cash purchase has no principal and interest while entered ownership expenses remain',()=>{const p=calculatePayment({...base,down:400000,mi:0});expect(p.principalInterest).toBe(0);expect(p.total).toBe(675)})
 it.each([{price:0},{down:400001},{rate:-1},{years:0},{years:51},{mi:-1},{price:NaN},{taxes:Infinity}])('rejects invalid assumptions %j',patch=>{expect(()=>calculatePayment({...base,...patch})).toThrow()})
 it('shorter amortization increases payment and lowers total interest for same principal and rate',()=>{const thirty=calculatePayment(base),fifteen=calculatePayment({...base,years:15});expect(fifteen.principalInterest).toBeGreaterThan(thirty.principalInterest);expect(fifteen.totalInterest).toBeLessThan(thirty.totalInterest)})
})
