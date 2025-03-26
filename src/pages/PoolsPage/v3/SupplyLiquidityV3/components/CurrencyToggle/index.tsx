import React, { useState } from 'react';
import Loader from 'components/Loader';
import { Box } from '@material-ui/core';
// import './index.scss';
import { useTranslation } from 'react-i18next';
import CurrencyLogo from 'components/CurrencyLogo';
import { Currency } from '@uniswap/sdk-core';

interface ICurrencyType {
  handleSelectCurrency: (currencyType: number) => void;
  currencyA: Currency | undefined;
  currencyB: Currency | undefined;
}

export function CurrencyToggle({
  handleSelectCurrency,
  currencyA,
  currencyB,
}: ICurrencyType) {
  const { t } = useTranslation();
  const [type, setType] = useState(1);

  const selectType = (type: number) => {
    handleSelectCurrency(type);
    setType(type);
  };

  return (
    <Box className='currency-toggle-container'>
      {currencyA && (
        <Box
          className={
            type === 1
              ? 'currency-toggle-active currency-toggle-item'
              : 'currency-toggle-item'
          }
          onClick={() => {
            selectType(1);
          }}
        >
          <CurrencyLogo size='24px' currency={currencyA} />
          <Box> {currencyA?.symbol}</Box>
        </Box>
      )}
      {currencyB && (
        <Box
          className={
            type === 2
              ? 'currency-toggle-active currency-toggle-item'
              : 'currency-toggle-item'
          }
          onClick={() => {
            selectType(2);
          }}
        >
          <CurrencyLogo size='24px' currency={currencyB} />
          <Box> {currencyB?.symbol}</Box>
        </Box>
      )}
    </Box>
  );
}
