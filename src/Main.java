import java.time.LocalDate;

public class Main {
    public static void main (String [] args){
        System.out.println("Proyecto Iniciado");
    
        new RentalPeriod(
        LocalDate.of(2026, 12, 3),
        LocalDate.of(2026, 12, 6)
        );

        System.out.println("Período creado");


        Vehicule car= new Vehicule("V01");
        System.out.println(car.getId());

        Customer primerCliente= new Customer("Ana","C01");
        System.out.println(primerCliente.getName());
    }

}
