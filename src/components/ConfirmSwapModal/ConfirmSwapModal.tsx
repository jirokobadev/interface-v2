import { Currency, currencyEquals, Trade } from '@uniswap/sdk';
import React, { useCallback, useMemo } from 'react';
import {
  TransactionConfirmationModal,
  TransactionErrorContent,
  ConfirmationModalContent,
} from 'components';
import SwapModalHeader from './SwapModalHeader';
import { formatTaxedTokenAmount, formatTokenAmount } from 'utils';
import 'components/styles/ConfirmSwapModal.scss';
import { useTranslation } from 'react-i18next';
import { OptimalRate } from '@paraswap/sdk';
import { useLiquidityHubState } from 'state/swap/liquidity-hub/hooks';

/**
 * Returns true if the trade requires a confirmation of details before we can submit it
 * @param tradeA trade A
 * @param tradeB trade B
 */
function tradeMeaningfullyDiffers(tradeA: Trade, tradeB: Trade): boolean {
  return (
    tradeA.tradeType !== tradeB.tradeType ||
    !currencyEquals(tradeA.inputAmount.currency, tradeB.inputAmount.currency) ||
    !tradeA.inputAmount.equalTo(tradeB.inputAmount) ||
    !currencyEquals(
      tradeA.outputAmount.currency,
      tradeB.outputAmount.currency,
    ) ||
    !tradeA.outputAmount.equalTo(tradeB.outputAmount)
  );
}

interface ConfirmSwapModalProps {
  isOpen: boolean;
  optimalRate?: OptimalRate | null;
  trade?: Trade;
  tax: number | null | undefined;
  originalTrade?: Trade;
  inputCurrency?: Currency;
  outputCurrency?: Currency;
  attemptingTxn: boolean;
  txPending?: boolean;
  txHash: string | undefined;
  recipient: string | null;
  allowedSlippage: number;
  onAcceptChanges: () => void;
  onConfirm: () => void;
  swapErrorMessage: string | undefined;
  onDismiss: () => void;
}

const ConfirmSwapModal: React.FC<ConfirmSwapModalProps> = ({
  trade,
  tax,
  optimalRate,
  inputCurrency,
  outputCurrency,
  originalTrade,
  onAcceptChanges,
  allowedSlippage,
  onConfirm,
  onDismiss,
  swapErrorMessage,
  isOpen,
  attemptingTxn,
  txHash,
  txPending,
}) => {
  const { t } = useTranslation();
  const showAcceptChanges = useMemo(
    () =>
      Boolean(
        !optimalRate &&
          trade &&
          originalTrade &&
          tradeMeaningfullyDiffers(trade, originalTrade),
      ),
    [originalTrade, trade, optimalRate],
  );

  const modalHeader = useCallback(() => {
    return optimalRate ?? trade ? (
      <SwapModalHeader
        trade={trade}
        tax={tax}
        optimalRate={optimalRate}
        inputCurrency={inputCurrency}
        outputCurrency={outputCurrency}
        allowedSlippage={allowedSlippage}
        onConfirm={onConfirm}
        showAcceptChanges={showAcceptChanges}
        onAcceptChanges={onAcceptChanges}
      />
    ) : null;
  }, [
    allowedSlippage,
    onAcceptChanges,
    optimalRate,
    showAcceptChanges,
    trade,
    tax,
    onConfirm,
    inputCurrency,
    outputCurrency,
  ]);

  const pendingOutPutAmount = tax
    ? formatTaxedTokenAmount(trade?.outputAmount, tax)
    : formatTokenAmount(trade?.outputAmount);

  const liquidityHubState = useLiquidityHubState();
  // text to show while loading
  const pendingText = t('swappingFor', {
    amount1: optimalRate
      ? Number(optimalRate.srcAmount) / 10 ** optimalRate.srcDecimals
      : formatTokenAmount(trade?.inputAmount),
    symbol1: trade
      ? trade?.inputAmount?.currency?.symbol
      : inputCurrency?.symbol,
    amount2: optimalRate
      ? Number(liquidityHubState.outAmount || optimalRate.destAmount) /
        10 ** optimalRate.destDecimals
      : pendingOutPutAmount,
    symbol2: trade
      ? trade?.outputAmount?.currency?.symbol
      : outputCurrency?.symbol,
  });

  const confirmationContent = useCallback(
    () =>
      swapErrorMessage ? (
        <TransactionErrorContent
          onDismiss={onDismiss}
          message={swapErrorMessage}
        />
      ) : (
        <ConfirmationModalContent
          title={t('confirmTx')}
          onDismiss={onDismiss}
          content={modalHeader}
        />
      ),
    [t, onDismiss, modalHeader, swapErrorMessage],
  );

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={onDismiss}
      attemptingTxn={attemptingTxn}
      hash={txHash}
      txPending={txPending}
      content={confirmationContent}
      pendingText={pendingText}
      modalContent={txPending ? t('submittedTxSwap') : t('swapSuccess')}
    />
  );
};

export default ConfirmSwapModal;
