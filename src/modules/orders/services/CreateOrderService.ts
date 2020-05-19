import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Invalid customer_id');
    }

    // const zeroQuantityProducts = products.filter(p => p.quantity < 1);
    // if (zeroQuantityProducts.length >= 1) {
    //   throw new AppError('Invalid product quantity');
    // }

    const catalogProducts = await this.productsRepository.findAllById(products);
    if (catalogProducts.length !== products.length) {
      throw new AppError('Invalid product_id');
    }

    const orderProducts = catalogProducts.map(prod => {
      const qtd = products.find(p => p.id === prod.id)?.quantity || 0;
      if (qtd > prod.quantity) {
        throw new AppError('Quantity bigger than product availability');
      }
      // eslint-disable-next-line no-param-reassign
      prod.quantity -= qtd;
      return { product_id: prod.id, price: prod.price, quantity: qtd };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(catalogProducts);

    return order;
  }
}

export default CreateProductService;
