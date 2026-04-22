-- Script para forçar a migração de transações que foram (possivelmente por erro de input ou fuso horário antigo)
-- registradas como sendo do mês comercial da fatura de Abril (ou seja, de 19 de março a 18 de Abril).
-- O usuário afirma que não deveria haver absolutamente NADA na fatura de Abril, portanto, 
-- essas transações serão empurradas para o dia 19/04, jogando-as matematicamente para a fatura de Maio.

UPDATE credit_card_transactions
SET date = '2026-04-19'
WHERE date >= '2026-03-19' 
  AND date <= '2026-04-18';
