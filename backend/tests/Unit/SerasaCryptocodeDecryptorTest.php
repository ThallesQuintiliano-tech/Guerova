<?php

namespace Tests\Unit;

use App\Services\SerasaCryptocodeDecryptor;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SerasaCryptocodeDecryptorTest extends TestCase
{
    #[Test]
    #[Group('slow')]
    public function it_decrypts_cryptocode_payload(): void
    {
        $sut = new SerasaCryptocodeDecryptor;

        // Gerado com PyCryptodome: scrypt + AES-256-GCM (mesmo algoritmo que Python cryptocode).
        $encrypted = 'Yj0alaz2a6CWZ2Q=*tOhg21SKsxdGyZbLjLcexA==*EsGZv2B5OIzB/la314O+oQ==*lKECfhaaAj/kp2Qj03+YyQ==';
        $password = 'testpass123';

        $this->assertSame('12345678901', $sut->decrypt($encrypted, $password));
    }

    #[Test]
    #[Group('slow')]
    public function it_returns_false_for_wrong_password(): void
    {
        $sut = new SerasaCryptocodeDecryptor;

        $encrypted = 'Yj0alaz2a6CWZ2Q=*tOhg21SKsxdGyZbLjLcexA==*EsGZv2B5OIzB/la314O+oQ==*lKECfhaaAj/kp2Qj03+YyQ==';

        $this->assertFalse($sut->decrypt($encrypted, 'wrong-password'));
    }

    #[Test]
    public function it_returns_false_for_malformed_string(): void
    {
        $sut = new SerasaCryptocodeDecryptor;

        $this->assertFalse($sut->decrypt('not*enough*parts', 'x'));
    }
}
