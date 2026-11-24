-- Demo people get the same "quick facts" real people now tap in the interview
-- (lib/questions.ts FACTS). Clones no longer guess what their profile doesn't say, so
-- without these a demo clone would answer "ask me in person" to "do you smoke?".
-- Data only: no schema change (facts live inside the private clone jsonb).

update public.profiles p
set clone = p.clone || jsonb_build_object('facts', f.facts)
from (values
  ('demo_maya',  '["Doesn''t smoke or vape.", "Drinks socially.", "Eats everything, meat included.", "Drinks coffee and loves it.", "Loves animals but doesn''t have a pet right now.", "Wants kids someday.", "Isn''t religious.", "Likes staying in on a Friday night; she is up at 6am to run."]'::jsonb),
  ('demo_leo',   '["Smokes or vapes sometimes, socially.", "Drinks socially.", "Eats everything, meat included, and loves street food.", "Drinks coffee and loves it.", "Loves animals but doesn''t have a pet right now, because he travels too much.", "Isn''t sure yet about having kids.", "Isn''t religious.", "Likes going out on a Friday night."]'::jsonb),
  ('demo_priya', '["Doesn''t smoke or vape.", "Doesn''t drink alcohol.", "Is vegetarian: no meat or fish.", "Doesn''t drink coffee; prefers chai.", "Is not a pet person and doesn''t want one.", "Wants kids someday.", "Faith is a small part of her life.", "Sometimes goes out on a Friday, sometimes stays in."]'::jsonb),
  ('demo_omar',  '["Doesn''t smoke or vape.", "Drinks socially.", "Eats everything, meat included.", "Drinks coffee and loves it.", "Has a cat and loves cats.", "Isn''t sure yet about having kids.", "Isn''t religious; he is an atheist.", "Likes staying in on a Friday night, or a late diner."]'::jsonb),
  ('demo_nora',  '["Doesn''t smoke or vape.", "Doesn''t drink alcohol.", "Is vegetarian: no meat or fish.", "Doesn''t drink coffee; prefers tea.", "Has a cat and loves cats.", "Wants kids someday.", "Faith is a small part of her life.", "Likes staying in on a Friday night."]'::jsonb),
  ('demo_jay',   '["Smokes or vapes sometimes, socially.", "Drinks regularly and enjoys it.", "Eats everything, meat included.", "Drinks coffee and loves it.", "Has a dog and loves dogs.", "Wants kids someday.", "Isn''t religious.", "Likes going out on a Friday night."]'::jsonb)
) as f(user_id, facts)
where p.user_id = f.user_id and p.is_demo;
