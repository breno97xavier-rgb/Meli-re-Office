\set ON_ERROR_STOP on
\ir finance-mvp-lab.sql
UPDATE workspaces SET status='active';
\ir ../../supabase/migrations/20261015183607_finance_cashflow_recurrence.sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
INSERT INTO finance_cash_settings(workspace_id,opening_cents,start_date,created_by)
VALUES('00000000-0000-0000-0000-000000000001',100000,'2026-01-01',auth.uid());
SELECT lab_assert('cash baseline audited',(SELECT count(*)=1 FROM finance_plan_events));
UPDATE finance_cash_settings SET opening_cents=-100;
SELECT lab_assert('baseline changes preserve snapshots',(SELECT count(*)=1 FROM finance_plan_events WHERE old_values->>'opening_cents'='100000' AND new_values->>'opening_cents'='-100'));
SELECT lab_denied('baseline author immutable',$s$UPDATE finance_cash_settings SET created_by='00000000-0000-0000-0000-000000000012'$s$);
SELECT lab_denied('baseline future date rejected',$s$UPDATE finance_cash_settings SET start_date=CURRENT_DATE+1$s$);
SELECT lab_denied('baseline hard deletion rejected',$s$DELETE FROM finance_cash_settings$s$);
INSERT INTO finance_recurrences(workspace_id,client_id,title,category,entry_type,amount_cents,start_date,end_date,due_day,created_by)
VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','Mensalidade fictícia','Mensalidade','income',200000,'2027-01-01','2027-03-31',31,auth.uid());
SELECT lab_assert('generate three pending months',(SELECT generate_finance_occurrences(workspace_id,id,'2027-01-01','2027-04-30')=3 FROM finance_recurrences));
SELECT lab_assert('short February uses last day',(SELECT count(*)=1 FROM finance_entries WHERE recurrence_id IS NOT NULL AND due_date='2027-02-28' AND competence_month='2027-02-01'));
SELECT lab_assert('all generated occurrences are pending',(SELECT bool_and(status='pending' AND settlement_date IS NULL AND created_by=auth.uid()) FROM finance_entries WHERE recurrence_id IS NOT NULL));
SELECT lab_assert('repeat generation is idempotent',(SELECT generate_finance_occurrences(workspace_id,id,'2027-01-01','2027-04-30')=0 FROM finance_recurrences));
UPDATE finance_entries SET status='cancelled' WHERE competence_month='2027-02-01';
SELECT lab_assert('cancelled month never recreated',(SELECT generate_finance_occurrences(workspace_id,id,'2027-02-01','2027-02-28')=0 FROM finance_recurrences));
SELECT lab_assert('issued entries retain audit',(SELECT count(*)=4 FROM finance_entry_events WHERE new_values->>'recurrence_id' IS NOT NULL));
SELECT lab_denied('recurring terms immutable',$s$UPDATE finance_recurrences SET amount_cents=100$s$);
SELECT lab_denied('recurrence workspace immutable',$s$UPDATE finance_recurrences SET workspace_id='00000000-0000-0000-0000-000000000002'$s$);
SELECT lab_denied('recurrence hard deletion rejected',$s$DELETE FROM finance_recurrences$s$);
SELECT lab_denied('cross agency client denied',$s$INSERT INTO finance_recurrences(workspace_id,client_id,title,category,entry_type,amount_cents,start_date,end_date,due_day,created_by) VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000022','X','X','expense',100,'2027-01-01',NULL,1,auth.uid())$s$);
SELECT lab_denied('income without end denied',$s$INSERT INTO finance_recurrences(workspace_id,title,category,entry_type,amount_cents,start_date,due_day,created_by) VALUES('00000000-0000-0000-0000-000000000001','X','X','income',100,'2027-01-01',1,auth.uid())$s$);
INSERT INTO finance_recurrences(workspace_id,title,category,entry_type,amount_cents,start_date,due_day,created_by)
VALUES('00000000-0000-0000-0000-000000000001','Pró-labore fictício','Geral','expense',50000,'2028-01-01',31,auth.uid());
SELECT lab_assert('indefinite internal expense generates only requested months',(SELECT generate_finance_occurrences(workspace_id,id,'2028-01-01','2028-03-31')=3 FROM finance_recurrences WHERE entry_type='expense'));
SELECT lab_assert('leap February uses day 29',(SELECT count(*)=1 FROM finance_entries WHERE due_date='2028-02-29'));
DO $$ BEGIN BEGIN PERFORM generate_finance_occurrences('00000000-0000-0000-0000-000000000001',(SELECT id FROM finance_recurrences LIMIT 1),'2027-01-01','2029-01-01'); RAISE EXCEPTION 'range unexpectedly accepted'; EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'PASS: generation horizon bounded'; END; END $$;
UPDATE finance_recurrences SET active=false WHERE entry_type='income';
DO $$ BEGIN BEGIN PERFORM generate_finance_occurrences('00000000-0000-0000-0000-000000000001',(SELECT id FROM finance_recurrences WHERE entry_type='income'),'2027-01-01','2027-03-31'); RAISE EXCEPTION 'stopped rule accepted'; EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'PASS: stopped rule cannot generate'; END; END $$;
SELECT lab_assert('stopping rule keeps issued entries',(SELECT count(*)=3 FROM finance_entries WHERE recurrence_id IN(SELECT id FROM finance_recurrences WHERE entry_type='income')));
INSERT INTO finance_recurrences(workspace_id,client_id,title,category,entry_type,amount_cents,start_date,end_date,due_day,created_by)
VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','Nova mensalidade fictícia','Mensalidade','income',250000,'2027-01-01','2027-04-30',31,auth.uid());
SELECT lab_assert('replacement agreement never duplicates issued or cancelled client months',(SELECT generate_finance_occurrences(workspace_id,id,'2027-01-01','2027-04-30')=1 FROM finance_recurrences WHERE title='Nova mensalidade fictícia'));
SELECT lab_denied('generated client cannot be reassigned',$s$UPDATE finance_entries SET client_id=NULL WHERE recurrence_id IS NOT NULL AND entry_type='income'$s$);
SELECT lab_denied('generated income cannot become expense',$s$UPDATE finance_entries SET entry_type='expense' WHERE recurrence_id IS NOT NULL AND entry_type='income'$s$);
SELECT lab_denied('plan history cannot be forged',$s$INSERT INTO finance_plan_events(workspace_id,entity,event_type,new_values) VALUES('00000000-0000-0000-0000-000000000001','X','INSERT','{}')$s$);
SELECT lab_denied('plan history cannot be changed',$s$UPDATE finance_plan_events SET new_values='{}'$s$);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',false);
SELECT lab_assert('foreign admin cannot read baseline',(SELECT count(*)=0 FROM finance_cash_settings));
SELECT lab_assert('foreign admin cannot read rules',(SELECT count(*)=0 FROM finance_recurrences));
SELECT lab_assert('foreign admin cannot read plan history',(SELECT count(*)=0 FROM finance_plan_events));
SELECT lab_denied('foreign admin cannot generate',$s$SELECT generate_finance_occurrences('00000000-0000-0000-0000-000000000001',gen_random_uuid(),'2027-01-01','2027-02-01')$s$);
RESET ROLE;
UPDATE workspace_members SET status='suspended' WHERE user_id='00000000-0000-0000-0000-000000000011';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT lab_assert('suspended admin cannot read rules',(SELECT count(*)=0 FROM finance_recurrences));
SELECT lab_denied('suspended admin cannot generate',$s$SELECT generate_finance_occurrences('00000000-0000-0000-0000-000000000001',gen_random_uuid(),'2027-01-01','2027-02-01')$s$);
RESET ROLE;
SET ROLE anon;
SELECT lab_denied('anon cash read denied',$s$SELECT * FROM finance_cash_settings$s$);
SELECT lab_denied('anon rules read denied',$s$SELECT * FROM finance_recurrences$s$);
SELECT lab_denied('anon generation denied',$s$SELECT generate_finance_occurrences(gen_random_uuid(),gen_random_uuid(),'2027-01-01','2027-02-01')$s$);
SELECT lab_denied('plan audit is not an RPC',$s$SELECT record_finance_plan_event()$s$);
RESET ROLE;
