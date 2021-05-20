import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const productAmount = stock.data.amount;

      if (!stock.data) {
        toast.error('Produto não encontrado');
        return;
      }

      const productInCart = cart.find(product => product.id === productId);

      const currAmount = productInCart ? productInCart.amount : 0;
      const newAmount = currAmount + 1;

      if (newAmount > productAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let newCart: Product[] = [];

      if (productInCart) {
        newCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: newAmount
        });
      } else {
        const response = await api.get(`/products/${productId}`);

        if (!response.data) {
          throw new Error('Produto não encontrado');
        }

        const normalizedProduct: Product = {
          ...response.data,
          amount: 1
        };

        newCart = [...cart, normalizedProduct];
      }

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productExists = cart.some(cartProduct => cartProduct.id === productId)
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return
      }
      
      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const productAmount = stock.data.amount;

      if (!stock.data) {
        throw new Error('Produto não encontrado');
      }

      if (amount > productAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productInCart = cart.some(product => product.id === productId);
      if (!productInCart) {
        throw new Error();
      }

      const newCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      });

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
