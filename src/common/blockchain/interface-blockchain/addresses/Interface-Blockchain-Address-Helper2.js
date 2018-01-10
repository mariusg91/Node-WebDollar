/*
 * Copyright (c) Silviu Stroe 2018.
*/
const bitcoin = require('bitcoinjs-lib');

class InterfaceBlockchainAddressHelper2 {

    /**
     *
     * @param publicKeys
     * @returns {*}
     *
     * Example:
     *
     let pubKeys = [
     '026477115981fe981a6918a6297d9803c4dc04f328f22041bedff886bbc2962e01',
     '02c96db2302d19b43d4c69368babace7854cc84eb9e061cde51cfa77ca4a22b8b9',
     '03c6103b3b83e4a24a0e33a4df246ef11772f9992663db0c35759a5e2ebf68d8e9'
     ];
     let address = InterfaceBlockchainAddressHelper2.generateAddress(pubKeys);
     */
    static generateAddress(publicKeys) {

        let pubKeys = publicKeys.map(function (hex) {
            return Buffer.from(hex, 'hex')
        });

        let redeemScript = bitcoin.script.multisig.output.encode(2, pubKeys); // 2 of 3
        let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript));
        let address = bitcoin.address.fromOutputScript(scriptPubKey);


        return address;
    }

    /**
     * create (and broadcast via 3PBP) a Transaction with a 2-of-4 P2SH(multisig) input
     * https://github.com/bitcoinjs/bitcoinjs-lib/blob/e0f24fdd46e11533a7140e02dc43b04a4cc4522e/test/integration/transactions.js#L115
     */
    createTransaction() {

        let keyPairs = [
            '91avARGdfge8E4tZfYLoxeJ5sGBdNJQH4kvjJoQFacbgwmaKkrx',
            '91avARGdfge8E4tZfYLoxeJ5sGBdNJQH4kvjJoQFacbgww7vXtT',
            '91avARGdfge8E4tZfYLoxeJ5sGBdNJQH4kvjJoQFacbgx3cTMqe',
            '91avARGdfge8E4tZfYLoxeJ5sGBdNJQH4kvjJoQFacbgx9rcrL7'
        ].map(function (wif) {
            return bitcoin.ECPair.fromWIF(wif, testnet)
        })
        let pubKeys = keyPairs.map(function (x) {
            return x.getPublicKeyBuffer()
        })

        let redeemScript = bitcoin.script.multisig.output.encode(2, pubKeys)
        let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
        let address = bitcoin.address.fromOutputScript(scriptPubKey, testnet)

        testnetUtils.faucet(address, 2e4, function (err, unspent) {
            if (err) return done(err)

            let txb = new bitcoin.TransactionBuilder(testnet)
            txb.addInput(unspent.txId, unspent.vout)
            txb.addOutput(testnetUtils.RETURN_ADDRESS, 1e4)

            txb.sign(0, keyPairs[0], redeemScript)
            txb.sign(0, keyPairs[2], redeemScript)

            let tx = txb.build()

            // build and broadcast to the Bitcoin Testnet network
            testnetUtils.transactions.propagate(tx.toHex(), function (err) {
                if (err) return done(err)

                testnetUtils.verify(address, tx.getId(), 1e4, done)
            })
        })
    }

}

module.exports = InterfaceBlockchainAddressHelper2;