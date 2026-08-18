import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class AddressDto { @IsString() name!: string; @IsString() addressLine1!: string; @IsString() city!: string; @IsString() state!: string; @IsString() pincode!: string; @IsString() phone!: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() country?: string; }
export class DimensionsDto { @IsNumber() @IsPositive() length!: number; @IsNumber() @IsPositive() breadth!: number; @IsNumber() @IsPositive() height!: number; }
export class CreateOrderDto {
  @IsString() orderId!: string; @IsString() courierPartner!: string; @IsString() invoiceNumber!: string; @IsString() invoiceDate!: string; @IsString() itemDescription!: string;
  @IsNumber() @Min(1) itemQuantity!: number; @IsNumber() @IsPositive() declaredValue!: number; @IsIn(['PREPAID', 'COD']) paymentMode!: 'PREPAID' | 'COD'; @IsNumber() @Min(0) collectableValue!: number; @IsNumber() @IsPositive() weightKg!: number;
  @ValidateNested() @Type(() => DimensionsDto) dimensionsCm!: DimensionsDto; @ValidateNested() @Type(() => AddressDto) shipper!: AddressDto; @ValidateNested() @Type(() => AddressDto) consignee!: AddressDto; @ValidateNested() @Type(() => AddressDto) returnAddress!: AddressDto;
}
export class BulkOrdersDto { @ValidateNested({ each: true }) @Type(() => CreateOrderDto) orders!: CreateOrderDto[]; }
