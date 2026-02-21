-- Enroll test face images for all users
-- This allows them to complete check-in/check-out verification

UPDATE users 
SET face_image_url = 'static/faces/default.jpg'
WHERE employee_id IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006');

-- Verify enrollment
SELECT employee_id, name, face_image_url 
FROM users 
WHERE employee_id IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006')
ORDER BY employee_id;
