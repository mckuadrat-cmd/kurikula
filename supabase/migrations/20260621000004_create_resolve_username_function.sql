CREATE OR REPLACE FUNCTION public.resolve_username_to_email(search_username TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE raw_user_meta_data->>'username' = LOWER(TRIM(search_username))
  LIMIT 1;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
