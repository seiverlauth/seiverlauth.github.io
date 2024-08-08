<?php
header('Content-Type: application/json');

$directory = 'images/';
$images = array();

if (is_dir($directory)) {
    $files = scandir($directory);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && !is_dir($directory . $file) && preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $file)) {
            $images[] = $file;
        }
    }
} else {
    echo json_encode(array('error' => 'Directory not found'));
    exit;
}

echo json_encode($images);
?>
