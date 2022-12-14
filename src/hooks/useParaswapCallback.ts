import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import {
  TransactionResponse,
  TransactionRequest,
} from '@ethersproject/providers';
import {
  JSBI,
  SwapParameters,
  Fraction,
  Currency,
  Percent,
} from '@uniswap/sdk';
import { useMemo, useState } from 'react';
import { GlobalConst, RouterTypes, SmartRouter } from 'constants/index';
import { useTransactionAdder } from 'state/transactions/hooks';
import { isAddress, shortenAddress, getSigner } from 'utils';
import { useActiveWeb3React } from 'hooks';
import useENS from './useENS';
import { OptimalRate } from 'paraswap-core';
import { useParaswap } from './useParaswap';
import { SwapSide } from '@paraswap/sdk';
import ParaswapABI from 'constants/abis/ParaSwap_ABI.json';
import { useContract } from './useContract';
import callWallchainAPI from 'utils/wallchainService';
import { useSwapActionHandlers, useSwapState } from 'state/swap/hooks';
import { ONE } from 'v3lib/utils';

export enum SwapCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface SwapCall {
  contract: Contract;
  parameters: SwapParameters;
}

interface SuccessfulCall {
  call: SwapCall;
  gasEstimate: BigNumber;
}

interface FailedCall {
  call: SwapCall;
  error: Error;
}

const convertToEthersTransaction = (txParams: any): TransactionRequest => {
  return {
    to: txParams.to,
    from: txParams.from,
    data: txParams.data,
    chainId: txParams.chainId,
    gasPrice: txParams.gasPrice,
    gasLimit: txParams.gas,
    value: txParams.value,
  };
};

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useParaswapCallback(
  priceRoute: OptimalRate | undefined,
  allowedSlippage: Percent, // in bips
  recipientAddressOrName: string | null, // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  inputCurrency?: Currency,
  outputCurrency?: Currency,
): {
  state: SwapCallbackState;
  callback:
    | null
    | (() => Promise<{ response: TransactionResponse; summary: string }>);
  error: string | null;
} {
  const { account, chainId, library } = useActiveWeb3React();
  const paraswap = useParaswap();
  const { onBestRoute, onSetSwapDelay } = useSwapActionHandlers();

  const addTransaction = useTransactionAdder();

  const { address: recipientAddress } = useENS(recipientAddressOrName);
  const recipient =
    recipientAddressOrName === null ? account : recipientAddress;

  const paraswapContract = useContract(
    priceRoute?.contractAddress,
    ParaswapABI,
  );

  const { bestRoute } = useSwapState();
  const masterInput = bestRoute.bonusRouter?.transactionArgs.masterInput;

  return useMemo(() => {
    if (!priceRoute || !library || !account || !chainId) {
      return {
        state: SwapCallbackState.INVALID,
        callback: null,
        error: 'Missing dependencies',
      };
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return {
          state: SwapCallbackState.INVALID,
          callback: null,
          error: 'Invalid recipient',
        };
      } else {
        return {
          state: SwapCallbackState.LOADING,
          callback: null,
          error: null,
        };
      }
    }

    const referrer = 'quickswapv3';

    const srcToken = priceRoute.srcToken;
    const destToken = priceRoute.destToken;

    //TODO: we need to support max impact
    // if (minDestAmount.greaterThan(JSBI.BigInt(priceRoute.destAmount))) {
    //   throw new Error('Price Rate updated beyond expected slipage rate');
    // }
    const minDestAmount = new Fraction(ONE)
      .add(allowedSlippage)
      .invert()
      .multiply(priceRoute.destAmount).quotient;

    return {
      state: SwapCallbackState.VALID,
      callback: async function onSwap(): Promise<{
        response: TransactionResponse;
        summary: string;
      }> {
        try {
          const txParams = await paraswap.buildTx({
            srcToken,
            destToken,
            srcAmount: priceRoute.srcAmount,
            destAmount: minDestAmount.toString(),
            priceRoute: priceRoute,
            userAddress: account,
            partner: referrer,
          });

          if (txParams.data && paraswapContract) {
            callWallchainAPI(
              priceRoute.contractMethod,
              txParams.data,
              txParams.value,
              chainId,
              account,
              paraswapContract,
              SmartRouter.PARASWAP,
              RouterTypes.SMART,
              onBestRoute,
              onSetSwapDelay,
            );
          }

          const signer = getSigner(library, account);
          const ethersTxParams = convertToEthersTransaction(txParams);

          return signer
            .sendTransaction(ethersTxParams)
            .then((response: TransactionResponse) => {
              const inputSymbol = inputCurrency?.symbol;
              const outputSymbol = outputCurrency?.symbol;
              const inputAmount =
                Number(priceRoute.srcAmount) / 10 ** priceRoute.srcDecimals;
              const outputAmount =
                Number(priceRoute.destAmount) / 10 ** priceRoute.destDecimals;

              const base = `Swap ${inputAmount.toLocaleString(
                'us',
              )} ${inputSymbol} for ${outputAmount.toLocaleString(
                'us',
              )} ${outputSymbol}`;
              const withRecipient =
                recipient === account
                  ? base
                  : `${base} to ${
                      recipientAddressOrName &&
                      isAddress(recipientAddressOrName)
                        ? shortenAddress(recipientAddressOrName)
                        : recipientAddressOrName
                    }`;

              const withVersion = withRecipient;

              addTransaction(response, {
                summary: withVersion,
              });

              return { response, summary: withVersion };
            })
            .catch((error: any) => {
              // if the user rejected the tx, pass this along
              if (error?.code === 4001) {
                throw new Error('Transaction rejected.');
              } else {
                throw new Error(`Swap failed: ${error.message}`);
              }
            });
        } catch (e) {
          console.log(e);
          throw new Error(
            'For rebase or taxed tokens, try market V2 instead of best trade.',
          );
        }
      },
      error: null,
    };
  }, [
    priceRoute,
    library,
    account,
    chainId,
    recipient,
    recipientAddressOrName,
    allowedSlippage,
    paraswap,
    addTransaction,
    onBestRoute,
    onSetSwapDelay,
    paraswapContract,
    inputCurrency,
    outputCurrency,
  ]);
}
