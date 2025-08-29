import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from "typeorm";
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import * as bcrypt from "bcryptjs";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  @IsNotEmpty({ message: "El nombre no puede estar vacío" })
  firstName: string;

  @Column({ type: "varchar", length: 100 })
  @IsNotEmpty({ message: "El apellido no puede estar vacío" })
  lastName: string;

  @Column({ type: "varchar", length: 255, unique: true })
  @IsEmail({}, { message: "Debe ser un email válido" })
  @IsNotEmpty({ message: "El email no puede estar vacío" })
  email: string;

  @Column({ type: "varchar", length: 255 })
  @IsNotEmpty({ message: "La contraseña no puede estar vacía" })
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  password: string;

  @Column({ type: "varchar", length: 50, default: "user" })
  role: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  toJSON() {
    const { password, ...result } = this;
    return result;
  }
} 