UPDATE employees
SET email = lower(replace(name, ' ', '.')) || '@example.com',
    data_json = json_set(data_json, '$.email', lower(replace(name, ' ', '.')) || '@example.com');
