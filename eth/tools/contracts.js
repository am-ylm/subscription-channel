const node_path = require('path');
const fs = require('fs');

const readContractBuild = (sol, contract = sol) => {
    const abi = JSON.parse(
        fs.readFileSync(node_path.join(__dirname, '..', 'build', `__eth_contracts_${sol}_sol_${contract}.abi`), 'utf8')
    );
    const bin = fs.readFileSync(node_path.join(__dirname, '..', 'build', `__eth_contracts_${sol}_sol_${contract}.bin`), 'utf8');

    return { abi, bin };
};

module.exports = { readContractBuild };