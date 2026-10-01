-- Local development only. Port is bound to loopback and credentials are not
-- production secrets. The migration grants least-privilege table access.
create role rcre_app login password 'local_only_rcre_app_password' noinherit;
