<?php
// This redirect page is to be hosted on the main website. It's main purpose is
// to call the "remot3.it" API to find out the current dynamic URL of the robot
// no matter what LAN or firewall is in place and then forward the user to the
// robots HTTP page.

$username = '';
$password = '';
$developerkey = '';
$deviceaddress = "";

// echo 'Developer Key: ' . $developerkey . '\n';

// Use credentials to login to the API to get a login token, store it in $token
$url = "http://api.remot3.it/apv/v23.5/user/login";
$data = array("username" => $username, "password" => $password);
$data_string = json_encode($data);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'developerkey: ' . $developerkey,
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data_string))
);
$result = curl_exec($ch);
$data = json_decode($result, true);
$token = $data['token'];
//close connection
curl_close($ch);

// echo 'Login Token: ' . $token . '\n';
// Get my IP
$hostip = file_get_contents("http://ipecho.net/plain");
// echo 'Host IP: ' . $hostip . '\n';

// Query API a second time
$url = "https://api.remot3.it/apv/v23.5/device/connect";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'developerkey: ' . $developerkey,
    'token: ' . $token,
    'content-type: application/json'
));
$data_string = json_encode(array("deviceaddress" => $deviceaddress, "hostip" => $hostip, "wait" => "true"));
curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
$result = curl_exec($ch);
$data = json_decode($result, true);
// echo print_r($data,true);
//close connection
curl_close($ch);


$url = $data['connection']['proxy'];
?><!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="5;url=<?php echo $url ?>" />
    </head>
    <body>
        <p>Redirecting to <a href="<?php echo $url ?>"><?php echo $url ?></a> in 5 seconds...</p>
    </body>
</html>