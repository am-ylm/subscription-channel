const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const { readContractBuild } = require("../eth/tools/contracts.js");
const web3 = new Web3(ganache.provider());

let accounts;
let factory;
let subAddress;
let subscription;

before(async () => {
  accounts = await web3.eth.getAccounts();

  const SubscriptionFactory = readContractBuild("Subscription", "SubscriptionFactory");
  const Subscription = readContractBuild("Subscription");

  factory = new web3.eth.Contract(SubscriptionFactory.abi);

  factory = await factory.deploy({ data: SubscriptionFactory.bin })
    .send({ from: accounts[0], gas: '1000000' });
    // console.log("factory contract was deployed:", factory.options.address);

    // TODO deploy subscription contract from within the factory
  // let newSub = await factory.methods.createSubscription(web3.utils.toWei('0.5', 'ether'))
  //   .send({
  //     from: accounts[0],
  //     gas: '1000000'
  //   });
  // subAddress = newSub.to;
  //   subscription = await new web3.eth.Contract(
  //       Subscription.abi,
  //       subAddress
  //   );

  subscription = await new web3.eth.Contract(
    Subscription.abi
  );
  subscription = await subscription.deploy({ data: Subscription.bin, arguments: [accounts[0], 100000] })
    .send({ from: accounts[0], gas: '1000000', value: web3.utils.toWei('0.5', 'ether') });
  // console.log("subscription contract was deployed:", factory.options.address);
});

describe('Subscription', () => {
  it('deploys a factory and a subscription', () => {
    assert.ok(factory.options.address);
    assert.ok(subscription.options.address);
  });

  it('allows to subscribe', async () => {
    const value = web3.utils.toWei('1', 'ether');
    let valFromContract = await subscription.methods.checkAddress(accounts[1]).call({from: accounts[0]});
    assert(valFromContract == 0);
    let res = await subscription.methods.subscribe().send({
      value,
      from: accounts[1]
    });
    valFromContract = await subscription.methods.checkAddress(accounts[1]).call({from: accounts[0]});
    assert(value == valFromContract);
  });

  it('requires a minimum fee', async () => {
    try {
      await await subscription.methods.subscribe().send({
        value: '5',
        from: accounts[2]
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('allows the owner to unsubscribe', async () => {
      await subscription.methods.subscribe().send({
          value: web3.utils.toWei('0.62', 'ether'),
          from: accounts[3]
      });
      const afterSubBalance = await web3.eth.getBalance(accounts[3]);

      await subscription.methods
      .unsubscribe(accounts[3])
      .send({
        from: accounts[0],
        gas: '1000000'
      });
    
    await subscription.methods
      .withdraw()
      .send({
        from: accounts[3],
        gas: '1000000'
      });

    const finalBalance = await web3.eth.getBalance(accounts[3]);
    const difference = finalBalance - afterSubBalance;
    assert(difference > web3.utils.toWei('0.4', 'ether'));
  });

  it('allows tips', async () => {
    const value = web3.utils.toWei('0.2', 'ether');
    await subscription.methods
      .tip()
      .send({
        value,
        from: accounts[2]
      });
    const valFromContract = await subscription.methods.checkTip(accounts[2]).call({from: accounts[0]});
    assert(value == valFromContract);
  });

  it('allow owner to withdraw', async () => {
      const beforeBalance = await web3.eth.getBalance(accounts[0]);

      await subscription.methods
        .withdraw(accounts[0], web3.utils.toWei('0.5', 'ether'))
        .send({
            from: accounts[0],
            gas: '1000000'
        });
      await subscription.methods
          .withdraw()
          .send({
              from: accounts[0],
              gas: '1000000'
          });

      const afterBalance = await web3.eth.getBalance(accounts[3]);
      const difference = afterBalance - beforeBalance;
      assert(difference > web3.utils.toWei('0.45', 'ether'));
  });

});
