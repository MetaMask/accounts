import React, { useState } from 'react';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import styled from 'styled-components';

import { Method } from './Method';
import { StyledBox } from './styledComponents';

const AccordionContainer = styled.div`
  width: 100%;
  margin: 0 auto;
`;

const AccordionItem = styled.div`
  border: 1px solid #eaeaea;
  border-radius: 4px;
  margin-bottom: 20px;
  padding: 8px;
  width: 100%;
`;

const AccordionHeader = styled.div`
  margin: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-size: 16px;
`;

const AccordionContent = styled.div`
  display: ${({ isOpen }: { isOpen: boolean }) => (isOpen ? 'block' : 'none')};
  padding: 0px 32px;
`;

export const Accordion = ({ items }: any) => {
  const [activeIndexes, setActiveIndexes] = useState<number[]>([]);

  const toggleAccordion = (index: number) => {
    let newIndexes;
    if (activeIndexes.includes(index)) {
      newIndexes = activeIndexes.filter((element: any) => element !== index);
    } else {
      newIndexes = [...activeIndexes, index];
    }
    setActiveIndexes(newIndexes);
  };

  return (
    <AccordionContainer>
      {items.map((item: any, index: number) => {
        return (
          <AccordionItem key={index}>
            <AccordionHeader onClick={() => toggleAccordion(index)}>
              {item.name}
              {activeIndexes.includes(index) ? (
                <IoIosArrowUp />
              ) : (
                <IoIosArrowDown />
              )}
            </AccordionHeader>
            <AccordionContent isOpen={activeIndexes.includes(index)}>
              <StyledBox sx={{ flexGrow: 1 }}>
                <Method
                  description={item.description}
                  inputs={item.inputs}
                  action={item.action}
                />
              </StyledBox>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </AccordionContainer>
  );
};

export default Accordion;
