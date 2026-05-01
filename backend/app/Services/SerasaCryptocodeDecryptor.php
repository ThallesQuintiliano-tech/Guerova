<?php

namespace App\Services;

use Cast\Crypto\Scrypt\Scrypt;

/**
 * Descriptografia compatível com a biblioteca Python `cryptocode` (massa de testes Serasa Experian):
 * scrypt (N=16384, r=8, p=1, dklen=32) + AES-256-GCM.
 */
class SerasaCryptocodeDecryptor
{
    public function decrypt(string $encryptedDocument, string $password): string|false
    {
        $encryptedDocument = trim($encryptedDocument);
        if ($encryptedDocument === '') {
            return false;
        }

        $parts = explode('*', $encryptedDocument);
        if (count($parts) !== 4) {
            return false;
        }

        $cipherText = base64_decode($parts[0], true);
        $salt = base64_decode($parts[1], true);
        $nonce = base64_decode($parts[2], true);
        $tag = base64_decode($parts[3], true);

        if ($cipherText === false || $salt === false || $nonce === false || $tag === false) {
            return false;
        }

        try {
            $privateKey = Scrypt::calc($password, $salt, 16384, 8, 1, 32);
        } catch (\Throwable) {
            return false;
        }

        $plain = openssl_decrypt($cipherText, 'aes-256-gcm', $privateKey, OPENSSL_RAW_DATA, $nonce, $tag);

        return $plain !== false ? $plain : false;
    }
}
